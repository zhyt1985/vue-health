import { ESLint } from "eslint";
import fs from "node:fs";
import path from "node:path";
import type { Diagnostic } from "../types.js";

const ESLINT_CONFIG_FILES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
];

const findEslintConfig = (dir: string): boolean =>
  ESLINT_CONFIG_FILES.some((f) => fs.existsSync(path.join(dir, f)));

/** eslint-plugin-vue rules selected for deep mode (high-value, not covered by oxlint) */
const SELECTED_VUE_RULES: Record<string, string | [string, ...any[]]> = {
  "vue/no-ref-object-reactivity-loss": "warn",
  "vue/prefer-use-template-ref": "warn",
  "vue/no-v-html": "warn",
  "vue/require-explicit-emits": "warn",
  "vue/no-undef-components": "warn",
  "vue/component-api-style": ["warn", ["script-setup", "composition"]],
  "vue/define-macros-order": ["warn", { order: ["defineProps", "defineEmits"] }],
  "vue/block-order": ["warn", { order: ["script", "template", "style"] }],
  "vue/no-empty-component-block": "warn",
};

/** vue-doctor custom rules for deep mode */
const VUE_DOCTOR_RULES: Record<string, string | [string, ...any[]]> = {
  "vue-doctor/no-reactive-destructure": "error",
  "vue-doctor/no-ref-in-computed": "error",
  "vue-doctor/no-async-watcheffect": "warn",
  "vue-doctor/no-index-as-key": "warn",
  "vue-doctor/no-expensive-inline-expression": "warn",
  "vue-doctor/no-giant-component": "warn",
  "vue-doctor/no-secrets-in-client": "error",
  "vue-doctor/require-emits-declaration": "warn",
};

const RULE_CATEGORY_MAP: Record<string, string> = {
  "vue-doctor/no-reactive-destructure": "Correctness",
  "vue-doctor/no-ref-in-computed": "Correctness",
  "vue-doctor/no-async-watcheffect": "Correctness",
  "vue-doctor/no-index-as-key": "Performance",
  "vue-doctor/no-expensive-inline-expression": "Performance",
  "vue-doctor/no-giant-component": "Best Practices",
  "vue-doctor/no-secrets-in-client": "Security",
  "vue-doctor/require-emits-declaration": "Best Practices",
  "vue/no-ref-object-reactivity-loss": "Correctness",
  "vue/prefer-use-template-ref": "Best Practices",
  "vue/no-v-html": "Security",
  "vue/require-explicit-emits": "Best Practices",
  "vue/no-undef-components": "Correctness",
  "vue/component-api-style": "Best Practices",
  "vue/define-macros-order": "Best Practices",
  "vue/block-order": "Best Practices",
  "vue/no-empty-component-block": "Best Practices",
};

const createBuiltinConfig = async (): Promise<any[]> => {
  const vuePlugin = await import("eslint-plugin-vue");
  const vueParser = await import("vue-eslint-parser");
  const vueDoctorPlugin = await import("../eslint-plugin/index.js");

  return [
    {
      files: ["**/*.vue"],
      languageOptions: {
        parser: vueParser.default ?? vueParser,
      },
      plugins: {
        vue: vuePlugin.default ?? vuePlugin,
        "vue-doctor": vueDoctorPlugin.default ?? vueDoctorPlugin,
      },
      rules: {
        ...SELECTED_VUE_RULES,
        ...VUE_DOCTOR_RULES,
      },
    },
  ];
};

const resolveCategory = (ruleId: string): string => {
  if (RULE_CATEGORY_MAP[ruleId]) return RULE_CATEGORY_MAP[ruleId];
  if (ruleId.startsWith("vue/")) return "Best Practices";
  if (ruleId.startsWith("vue-doctor/")) return "Best Practices";
  return "Other";
};

const toDiagnostic = (
  filePath: string,
  msg: ESLint.LintMessage,
): Diagnostic => {
  const ruleId = msg.ruleId ?? "unknown";
  const parts = ruleId.includes("/") ? ruleId.split("/") : ["eslint", ruleId];
  const plugin = parts.slice(0, -1).join("/");
  const rule = parts[parts.length - 1];

  return {
    filePath,
    plugin,
    rule,
    severity: msg.severity === 2 ? "error" : "warning",
    message: msg.message,
    help: "",
    line: msg.line,
    column: msg.column,
    category: resolveCategory(ruleId),
  };
};

export const runEslint = async (
  rootDirectory: string,
  includePaths?: string[],
  configFile?: string,
): Promise<Diagnostic[]> => {
  if (includePaths !== undefined && includePaths.length === 0) return [];

  const hasUserConfig = configFile || findEslintConfig(rootDirectory);
  const patterns = includePaths ?? ["**/*.vue"];

  if (hasUserConfig) {
    try {
      const eslint = new ESLint({
        cwd: rootDirectory,
        ...(configFile ? { overrideConfigFile: configFile } : {}),
      });
      const results = await eslint.lintFiles(patterns);
      return results.flatMap((r) =>
        r.messages.map((msg) => toDiagnostic(r.filePath, msg as any)),
      );
    } catch {
      // User config failed to load (missing deps, etc.) — fallback to builtin
    }
  }

  const eslint = new ESLint({
    cwd: rootDirectory,
    overrideConfigFile: true,
    overrideConfig: await createBuiltinConfig(),
  });
  const results = await eslint.lintFiles(patterns);
  return results.flatMap((r) =>
    r.messages.map((msg) => toDiagnostic(r.filePath, msg as any)),
  );
};
