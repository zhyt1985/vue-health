import type { Diagnostic, VueDoctorConfig } from "../types.js";

export const filterIgnoredDiagnostics = (
  diagnostics: Diagnostic[],
  config: VueDoctorConfig | null,
): Diagnostic[] => {
  if (!config?.ignore) return diagnostics;

  const ignoredRules = new Set(config.ignore.rules ?? []);
  const ignoredFiles = config.ignore.files ?? [];

  return diagnostics.filter((diagnostic) => {
    const ruleKey = `${diagnostic.plugin}/${diagnostic.rule}`;
    if (ignoredRules.has(ruleKey) || ignoredRules.has(diagnostic.rule)) {
      return false;
    }

    for (const pattern of ignoredFiles) {
      if (diagnostic.filePath.includes(pattern)) {
        return false;
      }
    }

    return true;
  });
};
