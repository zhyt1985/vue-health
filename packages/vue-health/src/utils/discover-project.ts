import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GIT_LS_FILES_MAX_BUFFER_BYTES, SOURCE_FILE_PATTERN } from "../constants.js";
import type {
  DependencyInfo,
  Framework,
  PackageJson,
  ProjectInfo,
  WorkspacePackage,
} from "../types.js";

const NUXT_CONFIG_FILENAMES = [
  "nuxt.config.js",
  "nuxt.config.ts",
  "nuxt.config.mjs",
];

const VITE_CONFIG_FILENAMES = [
  "vite.config.js",
  "vite.config.ts",
  "vite.config.mjs",
  "vite.config.cjs",
];

const FRAMEWORK_PACKAGES: Record<string, Framework> = {
  nuxt: "nuxt",
  "nuxt3": "nuxt",
  vite: "vite",
  "@vue/cli-service": "vue-cli",
  quasar: "quasar",
  "@quasar/app-vite": "quasar",
  "@quasar/app-webpack": "quasar",
};

const FRAMEWORK_DISPLAY_NAMES: Record<Framework, string> = {
  nuxt: "Nuxt",
  vite: "Vite",
  "vue-cli": "Vue CLI",
  quasar: "Quasar",
  unknown: "Vue",
};

export const formatFrameworkName = (framework: Framework): string =>
  FRAMEWORK_DISPLAY_NAMES[framework];

const readPackageJson = (rootDirectory: string): PackageJson | null => {
  const packageJsonPath = path.join(rootDirectory, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as PackageJson;
};

const countSourceFiles = (rootDirectory: string): number => {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: rootDirectory,
    encoding: "utf-8",
    maxBuffer: GIT_LS_FILES_MAX_BUFFER_BYTES,
  });

  if (result.error || result.status !== 0) return 0;

  return result.stdout
    .split("\n")
    .filter((filePath) => filePath.length > 0 && SOURCE_FILE_PATTERN.test(filePath)).length;
};

const collectAllDependencies = (packageJson: PackageJson): Record<string, string> => ({
  ...packageJson.peerDependencies,
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});

const detectFramework = (dependencies: Record<string, string>): Framework => {
  for (const [packageName, frameworkName] of Object.entries(FRAMEWORK_PACKAGES)) {
    if (dependencies[packageName]) return frameworkName;
  }
  return "unknown";
};

const extractDependencyInfo = (packageJson: PackageJson): DependencyInfo => {
  const allDependencies = collectAllDependencies(packageJson);
  return {
    vueVersion: allDependencies.vue ?? null,
    framework: detectFramework(allDependencies),
  };
};

const detectFrameworkByConfig = (rootDirectory: string): Framework | null => {
  for (const filename of NUXT_CONFIG_FILENAMES) {
    if (fs.existsSync(path.join(rootDirectory, filename))) return "nuxt";
  }
  for (const filename of VITE_CONFIG_FILENAMES) {
    if (fs.existsSync(path.join(rootDirectory, filename))) return "vite";
  }
  if (fs.existsSync(path.join(rootDirectory, "vue.config.js"))) return "vue-cli";
  return null;
};

const hasTypeScript = (rootDirectory: string): boolean =>
  fs.existsSync(path.join(rootDirectory, "tsconfig.json"));

export const discoverProject = (rootDirectory: string): ProjectInfo => {
  const packageJson = readPackageJson(rootDirectory);
  const projectName = packageJson?.name ?? path.basename(rootDirectory);

  if (!packageJson) {
    return {
      rootDirectory,
      projectName,
      vueVersion: null,
      framework: detectFrameworkByConfig(rootDirectory) ?? "unknown",
      hasTypeScript: hasTypeScript(rootDirectory),
      sourceFileCount: countSourceFiles(rootDirectory),
    };
  }

  const depInfo = extractDependencyInfo(packageJson);
  const framework = depInfo.framework === "unknown"
    ? (detectFrameworkByConfig(rootDirectory) ?? "unknown")
    : depInfo.framework;

  return {
    rootDirectory,
    projectName,
    vueVersion: depInfo.vueVersion,
    framework,
    hasTypeScript: hasTypeScript(rootDirectory),
    sourceFileCount: countSourceFiles(rootDirectory),
  };
};

export const getWorkspacePackages = (rootDirectory: string): WorkspacePackage[] => {
  const packageJson = readPackageJson(rootDirectory);
  if (!packageJson) return [];

  const workspacePatterns = Array.isArray(packageJson.workspaces)
    ? packageJson.workspaces
    : packageJson.workspaces?.packages ?? [];

  if (workspacePatterns.length === 0) return [];

  const packages: WorkspacePackage[] = [];
  for (const pattern of workspacePatterns) {
    const baseDir = pattern.replace(/\/?\*$/, "");
    const fullPath = path.join(rootDirectory, baseDir);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) continue;

    const entries = fs.readdirSync(fullPath);
    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry);
      const entryPkgPath = path.join(entryPath, "package.json");
      if (fs.existsSync(entryPkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(entryPkgPath, "utf-8"));
        packages.push({ name: pkg.name ?? entry, directory: entryPath });
      }
    }
  }
  return packages;
};
