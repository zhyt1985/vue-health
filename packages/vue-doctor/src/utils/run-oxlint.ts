import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { ERROR_PREVIEW_LENGTH_CHARS, SOURCE_FILE_PATTERN } from "../constants.js";
import type { Diagnostic, Framework, OxlintOutput } from "../types.js";

const esmRequire = createRequire(import.meta.url);

/** Directories and files commonly containing generated/vendored code that should not be linted. */
const IGNORED_PATTERNS = [
  "public/**",
  "dist/**",
  "dist-*/**",
  ".output/**",
  ".nuxt/**",
  ".next/**",
  "coverage/**",
  "__snapshots__/**",
  "**/iconfont/**",
  "**/*.min.js",
  "**/*.min.mjs",
  "**/vendor/**",
];

const PLUGIN_CATEGORY_MAP: Record<string, string> = {
  vue: "Correctness",
  "jsx-a11y": "Accessibility",
  unicorn: "Best Practices",
  import: "Best Practices",
};

const RULE_CATEGORY_MAP: Record<string, string> = {
  // Vue Essentials (Error Prevention)
  "vue/no-arrow-functions-in-watch": "Correctness",
  "vue/no-async-in-computed-properties": "Correctness",
  "vue/no-child-content": "Correctness",
  "vue/no-computed-properties-in-data": "Correctness",
  "vue/no-dupe-keys": "Correctness",
  "vue/no-dupe-v-else-if": "Correctness",
  "vue/no-dupe-v-for-key": "Correctness",
  "vue/no-duplicate-attributes": "Correctness",
  "vue/no-export-in-script-setup": "Correctness",
  "vue/no-lifecycle-after-await": "Correctness",
  "vue/no-mutating-props": "Correctness",
  "vue/no-parsing-error": "Correctness",
  "vue/no-ref-as-operand": "Correctness",
  "vue/no-reserved-component-names": "Correctness",
  "vue/no-reserved-keys": "Correctness",
  "vue/no-reserved-props": "Correctness",
  "vue/no-setup-props-reactivity-loss": "Correctness",
  "vue/no-shared-component-data": "Correctness",
  "vue/no-side-effects-in-computed-properties": "Correctness",
  "vue/no-template-key": "Correctness",
  "vue/no-textarea-mustache": "Correctness",
  "vue/no-unused-components": "Dead Code",
  "vue/no-unused-vars": "Dead Code",
  "vue/no-use-computed-property-like-method": "Correctness",
  "vue/no-use-v-if-with-v-for": "Performance",
  "vue/no-useless-template-attributes": "Best Practices",
  "vue/no-v-text-v-html-on-component": "Correctness",
  "vue/no-watch-after-await": "Correctness",
  "vue/require-component-is": "Correctness",
  "vue/require-prop-type-constructor": "Correctness",
  "vue/require-render-return": "Correctness",
  "vue/require-v-for-key": "Correctness",
  "vue/require-valid-default-prop": "Correctness",
  "vue/return-in-computed-property": "Correctness",
  "vue/use-v-on-exact": "Correctness",
  "vue/valid-attribute-name": "Correctness",
  "vue/valid-define-emits": "Correctness",
  "vue/valid-define-props": "Correctness",
  "vue/valid-next-tick": "Correctness",
  "vue/valid-template-root": "Correctness",
  "vue/valid-v-bind": "Correctness",
  "vue/valid-v-cloak": "Correctness",
  "vue/valid-v-else-if": "Correctness",
  "vue/valid-v-else": "Correctness",
  "vue/valid-v-for": "Correctness",
  "vue/valid-v-html": "Correctness",
  "vue/valid-v-if": "Correctness",
  "vue/valid-v-is": "Correctness",
  "vue/valid-v-memo": "Correctness",
  "vue/valid-v-model": "Correctness",
  "vue/valid-v-on": "Correctness",
  "vue/valid-v-once": "Correctness",
  "vue/valid-v-pre": "Correctness",
  "vue/valid-v-show": "Correctness",
  "vue/valid-v-slot": "Correctness",
  "vue/valid-v-text": "Correctness",

  // Performance / Security
  "vue/no-v-html": "Security",
};

const RULE_HELP_MAP: Record<string, string> = {
  "no-arrow-functions-in-watch": "Use regular functions in watch so `this` refers to the component instance",
  "no-async-in-computed-properties": "Move async logic to methods or watchers — computed properties must be synchronous",
  "no-child-content": "Remove child content when using v-html or v-text — it will be overwritten",
  "no-computed-properties-in-data": "Use computed properties or methods instead of referencing computed in data()",
  "no-dupe-keys": "Rename the duplicate key — each property name must be unique across data, computed, and methods",
  "no-mutating-props": "Use `emit('update:propName', newValue)` or a local data copy instead of mutating props directly",
  "no-ref-as-operand": "Use `.value` to access ref values in script: `count.value++` instead of `count++`",
  "no-setup-props-reactivity-loss": "Use `toRefs(props)` or `computed(() => props.x)` to maintain reactivity",
  "no-shared-component-data": "Return a new object from data(): `data() { return { ... } }` to avoid shared state",
  "no-side-effects-in-computed-properties": "Move side effects to watchers or methods — computed should be pure",
  "no-unused-components": "Remove the unused component import or use it in the template",
  "no-unused-vars": "Remove the unused variable or prefix with `_` to indicate intentional non-use",
  "no-use-v-if-with-v-for": "Move v-if to a wrapper element or use computed to filter the list before v-for",
  "no-v-html": "v-html can lead to XSS attacks — sanitize content or use text interpolation instead",
  "no-watch-after-await": "Move watch() calls before any await in setup() — they won't be registered after await",
  "no-lifecycle-after-await": "Move lifecycle hooks before any await in setup() — they won't be registered after await",
  "require-v-for-key": "Add a unique `:key` binding to v-for elements for efficient DOM updates",
  "return-in-computed-property": "Computed properties must return a value — add a return statement",
  "valid-v-model": "v-model requires a valid writable expression — use a data property or computed with getter/setter",
};

const parseRuleCode = (code: string): { plugin: string; rule: string } => {
  const match = code.match(/^(.+)\((.+)\)$/);
  if (!match) return { plugin: "unknown", rule: code };
  return { plugin: match[1].replace(/^eslint-plugin-/, ""), rule: match[2] };
};

const resolveOxlintBinary = (): string => {
  const oxlintMainPath = esmRequire.resolve("oxlint");
  const oxlintPackageDirectory = path.resolve(path.dirname(oxlintMainPath), "..");
  return path.join(oxlintPackageDirectory, "bin", "oxlint");
};

const resolveDiagnosticCategory = (plugin: string, rule: string): string => {
  const ruleKey = `${plugin}/${rule}`;
  return RULE_CATEGORY_MAP[ruleKey] ?? PLUGIN_CATEGORY_MAP[plugin] ?? "Other";
};

export const runOxlint = async (
  rootDirectory: string,
  hasTypeScript: boolean,
  framework: Framework,
  includePaths?: string[],
): Promise<Diagnostic[]> => {
  if (includePaths !== undefined && includePaths.length === 0) return [];

  const configPath = path.join(os.tmpdir(), `vue-doctor-oxlintrc-${process.pid}.json`);
  const config = createOxlintConfig(framework);

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const oxlintBinary = resolveOxlintBinary();
    const args = [oxlintBinary, "-c", configPath, "--format", "json"];

    for (const pattern of IGNORED_PATTERNS) {
      args.push("--ignore-pattern", pattern);
    }

    if (hasTypeScript) {
      args.push("--tsconfig", "./tsconfig.json");
    }

    if (includePaths !== undefined) {
      args.push(...includePaths);
    } else {
      args.push(".");
    }

    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, args, { cwd: rootDirectory });
      const stdoutBuffers: Buffer[] = [];
      const stderrBuffers: Buffer[] = [];

      child.stdout.on("data", (buffer: Buffer) => stdoutBuffers.push(buffer));
      child.stderr.on("data", (buffer: Buffer) => stderrBuffers.push(buffer));

      child.on("error", (error) => reject(new Error(`Failed to run oxlint: ${error.message}`)));
      child.on("close", () => {
        const output = Buffer.concat(stdoutBuffers).toString("utf-8").trim();
        if (!output) {
          const stderrOutput = Buffer.concat(stderrBuffers).toString("utf-8").trim();
          if (stderrOutput) {
            reject(new Error(`Failed to run oxlint: ${stderrOutput}`));
            return;
          }
        }
        resolve(output);
      });
    });

    if (!stdout) return [];

    let output: OxlintOutput;
    try {
      output = JSON.parse(stdout) as OxlintOutput;
    } catch {
      throw new Error(
        `Failed to parse oxlint output: ${stdout.slice(0, ERROR_PREVIEW_LENGTH_CHARS)}`,
      );
    }

    return output.diagnostics
      .filter((diagnostic) => diagnostic.code && SOURCE_FILE_PATTERN.test(diagnostic.filename))
      .map((diagnostic) => {
        const { plugin, rule } = parseRuleCode(diagnostic.code);
        const primaryLabel = diagnostic.labels[0];
        const help = diagnostic.help || RULE_HELP_MAP[rule] || "";

        return {
          filePath: diagnostic.filename,
          plugin,
          rule,
          severity: diagnostic.severity,
          message: diagnostic.message,
          help,
          line: primaryLabel?.span.line ?? 0,
          column: primaryLabel?.span.column ?? 0,
          category: resolveDiagnosticCategory(plugin, rule),
        };
      });
  } finally {
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  }
};

const createOxlintConfig = (framework: Framework) => {
  const rules: Record<string, "warn" | "error"> = {
    // Vue essential rules
    "no-dupe-keys": "error",
    "no-mutating-props": "error",
    "no-ref-as-operand": "error",
    "no-reserved-keys": "error",
    "no-shared-component-data": "error",
    "no-side-effects-in-computed-properties": "error",
    "no-async-in-computed-properties": "error",
    "no-computed-properties-in-data": "error",
    "no-arrow-functions-in-watch": "error",
    "no-watch-after-await": "error",
    "no-lifecycle-after-await": "error",
    "no-setup-props-reactivity-loss": "warn",
    "require-v-for-key": "warn",
    "no-use-v-if-with-v-for": "warn",
    "no-unused-components": "warn",
    "no-unused-vars": "warn",
    "no-v-html": "warn",
    "return-in-computed-property": "error",
    "valid-v-model": "error",
    "valid-v-for": "error",
    "valid-v-if": "error",
    "valid-v-on": "error",
    "valid-v-bind": "error",
    "valid-v-slot": "error",
  };

  return {
    rules,
    plugins: ["vue"],
    categories: {},
  };
};
