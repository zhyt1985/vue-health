import type { Diagnostic, ScoreResult } from "../types.js";
import { PERFECT_SCORE, SCORE_GOOD_THRESHOLD, SCORE_OK_THRESHOLD } from "../constants.js";

const SEVERITY_WEIGHTS: Record<string, number> = {
  error: 3,
  warning: 1,
};

/** Maximum total penalty a single rule can contribute. */
const PER_RULE_CAP: Record<string, number> = {
  error: 15,
  warning: 10,
};

export const calculateScore = (diagnostics: Diagnostic[]): ScoreResult => {
  if (diagnostics.length === 0) {
    return { score: PERFECT_SCORE, label: "Perfect" };
  }

  // Group by rule key and apply per-rule cap
  const ruleGroups = new Map<string, { severity: string; penalty: number }>();
  for (const diagnostic of diagnostics) {
    const ruleKey = `${diagnostic.plugin}/${diagnostic.rule}`;
    const weight = diagnostic.weight ?? SEVERITY_WEIGHTS[diagnostic.severity] ?? 1;
    const existing = ruleGroups.get(ruleKey);
    if (existing) {
      existing.penalty += weight;
    } else {
      ruleGroups.set(ruleKey, { severity: diagnostic.severity, penalty: weight });
    }
  }

  let totalPenalty = 0;
  for (const { severity, penalty } of ruleGroups.values()) {
    const cap = PER_RULE_CAP[severity] ?? PER_RULE_CAP.warning;
    totalPenalty += Math.min(penalty, cap);
  }

  const score = Math.max(0, Math.round(PERFECT_SCORE - totalPenalty * 0.5));

  let label: string;
  if (score >= SCORE_GOOD_THRESHOLD) {
    label = "Good";
  } else if (score >= SCORE_OK_THRESHOLD) {
    label = "OK";
  } else {
    label = "Needs Work";
  }

  return { score, label };
};
