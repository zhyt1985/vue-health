import type { Diagnostic, ScanOptions, ScoreResult } from "./types.js";
import { scan } from "./scan.js";

export type { Diagnostic, ScanOptions, ScoreResult };

export interface DiagnoseResult {
  diagnostics: Diagnostic[];
  score: ScoreResult;
}

export const diagnose = async (
  directory: string,
  options: ScanOptions = {},
): Promise<DiagnoseResult> => {
  return scan(directory, { ...options, scoreOnly: true });
};
