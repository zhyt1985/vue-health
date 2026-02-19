import fs from "node:fs";
import path from "node:path";
import type { VueDoctorConfig } from "../types.js";

const CONFIG_FILENAMES = [
  "vue-health.config.json",
  "vue-health.config.js",
  "vue-health.config.mjs",
  ".vue-health.json",
];

export const loadConfig = (rootDirectory: string): VueDoctorConfig | null => {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(rootDirectory, filename);
    if (fs.existsSync(configPath)) {
      if (filename.endsWith(".json")) {
        const content = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(content) as VueDoctorConfig;
      }
    }
  }

  const packageJsonPath = path.join(rootDirectory, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    if (packageJson["vue-health"]) {
      return packageJson["vue-health"] as VueDoctorConfig;
    }
  }

  return null;
};
