import { performance } from "node:perf_hooks";
import {
  MILLISECONDS_PER_SECOND,
  PERFECT_SCORE,
  SCORE_BAR_WIDTH_CHARS,
  SCORE_GOOD_THRESHOLD,
  SCORE_OK_THRESHOLD,
  SEPARATOR_LENGTH_CHARS,
  SUMMARY_BOX_HORIZONTAL_PADDING_CHARS,
  SUMMARY_BOX_OUTER_INDENT_CHARS,
} from "./constants.js";
import type { Diagnostic, ScanOptions, ScoreResult } from "./types.js";
import { calculateScore } from "./utils/calculate-score.js";
import { discoverProject, formatFrameworkName } from "./utils/discover-project.js";
import { filterIgnoredDiagnostics } from "./utils/filter-diagnostics.js";
import { groupBy } from "./utils/group-by.js";
import { highlighter } from "./utils/highlighter.js";
import { indentMultilineText } from "./utils/indent-multiline-text.js";
import { loadConfig } from "./utils/load-config.js";
import { logger } from "./utils/logger.js";
import { runKnip } from "./utils/run-knip.js";
import { runOxlint } from "./utils/run-oxlint.js";
import { runEslint } from "./utils/run-eslint.js";
import { spinner } from "./utils/spinner.js";

const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1 };

const colorizeBySeverity = (text: string, severity: Diagnostic["severity"]): string =>
  severity === "error" ? highlighter.error(text) : highlighter.warn(text);

const sortBySeverity = (groups: [string, Diagnostic[]][]): [string, Diagnostic[]][] =>
  groups.toSorted(([, a], [, b]) => {
    return (SEVERITY_ORDER[a[0].severity] ?? 1) - (SEVERITY_ORDER[b[0].severity] ?? 1);
  });

const buildFileLineMap = (diagnostics: Diagnostic[]): Map<string, number[]> => {
  const fileLines = new Map<string, number[]>();
  for (const d of diagnostics) {
    const lines = fileLines.get(d.filePath) ?? [];
    if (d.line > 0) lines.push(d.line);
    fileLines.set(d.filePath, lines);
  }
  return fileLines;
};

const printDiagnostics = (diagnostics: Diagnostic[], isVerbose: boolean): void => {
  const ruleGroups = groupBy(diagnostics, (d) => `${d.plugin}/${d.rule}`);
  const sorted = sortBySeverity([...ruleGroups.entries()]);

  for (const [, ruleDiagnostics] of sorted) {
    const first = ruleDiagnostics[0];
    const symbol = first.severity === "error" ? "✗" : "⚠";
    const icon = colorizeBySeverity(symbol, first.severity);
    const count = ruleDiagnostics.length;
    const countLabel = count > 1 ? colorizeBySeverity(` (${count})`, first.severity) : "";

    logger.log(` ${icon} ${first.message}${countLabel}`);
    if (first.help) {
      logger.dim(indentMultilineText(first.help, "    "));
    }

    if (isVerbose) {
      const fileLines = buildFileLineMap(ruleDiagnostics);
      for (const [filePath, lines] of fileLines) {
        const lineLabel = lines.length > 0 ? `: ${lines.join(", ")}` : "";
        logger.dim(`    ${filePath}${lineLabel}`);
      }
    }
    logger.break();
  }
};

const formatElapsedTime = (ms: number): string => {
  if (ms < MILLISECONDS_PER_SECOND) return `${Math.round(ms)}ms`;
  return `${(ms / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
};

const colorizeByScore = (text: string, score: number): string => {
  if (score >= SCORE_GOOD_THRESHOLD) return highlighter.success(text);
  if (score >= SCORE_OK_THRESHOLD) return highlighter.warn(text);
  return highlighter.error(text);
};

const buildScoreBar = (score: number): string => {
  const filled = Math.round((score / PERFECT_SCORE) * SCORE_BAR_WIDTH_CHARS);
  const empty = SCORE_BAR_WIDTH_CHARS - filled;
  return colorizeByScore("█".repeat(filled), score) + highlighter.dim("░".repeat(empty));
};

const getDoctorFace = (score: number): string => {
  if (score >= SCORE_GOOD_THRESHOLD) return "( ◕‿◕)";
  if (score >= SCORE_OK_THRESHOLD) return "( ◑‿◑)";
  return "( ◉_◉)";
};

const printSummary = (
  scoreResult: ScoreResult,
  diagnosticCount: number,
  elapsedMs: number,
  projectName: string,
  framework: string,
  vueVersion: string | null,
): void => {
  const separator = "─".repeat(SEPARATOR_LENGTH_CHARS);
  logger.log(separator);
  logger.break();

  const face = getDoctorFace(scoreResult.score);
  const scoreText = colorizeByScore(`${scoreResult.score}/100`, scoreResult.score);
  const labelText = colorizeByScore(scoreResult.label, scoreResult.score);

  logger.log(`  ${face}  ${highlighter.bold("Vue Doctor")} — ${projectName}`);
  logger.break();
  logger.log(`  Score: ${scoreText} ${labelText}`);
  logger.log(`  ${buildScoreBar(scoreResult.score)}`);
  logger.break();

  const details = [
    `Framework: ${framework}`,
    vueVersion ? `Vue: ${vueVersion}` : null,
    `Issues: ${diagnosticCount}`,
    `Time: ${formatElapsedTime(elapsedMs)}`,
  ].filter(Boolean);

  logger.dim(`  ${details.join(" · ")}`);
  logger.break();
};

export const scan = async (
  rootDirectory: string,
  options: ScanOptions = {},
): Promise<{ diagnostics: Diagnostic[]; score: ScoreResult }> => {
  const {
    lint = true,
    deadCode = true,
    verbose = false,
    scoreOnly = false,
    includePaths,
    deep = false,
  } = options;

  const startTime = performance.now();
  const project = discoverProject(rootDirectory);
  const config = loadConfig(rootDirectory);

  if (!scoreOnly) {
    const frameworkLabel = formatFrameworkName(project.framework);
    const vueLabel = project.vueVersion ? ` (Vue ${project.vueVersion})` : "";
    logger.dim(`  ${frameworkLabel}${vueLabel} · ${project.sourceFileCount} source files`);
    logger.break();
  }

  const diagnostics: Diagnostic[] = [];

  // Run lint checks
  if (lint) {
    if (deep) {
      if (!scoreOnly) spinner.start("Running deep analysis (ESLint)...");
      try {
        const eslintConfigFile = config?.eslint?.configFile;
        const lintDiagnostics = await runEslint(rootDirectory, includePaths, eslintConfigFile);
        diagnostics.push(...lintDiagnostics);
        if (!scoreOnly) spinner.succeed(`Found ${lintDiagnostics.length} lint issues (deep)`);
      } catch (error) {
        if (!scoreOnly) spinner.fail("Deep analysis failed");
      }
    } else {
      if (!scoreOnly) spinner.start("Running lint checks...");
      try {
        const lintDiagnostics = await runOxlint(
          rootDirectory,
          project.hasTypeScript,
          project.framework,
          includePaths,
        );
        diagnostics.push(...lintDiagnostics);
        if (!scoreOnly) spinner.succeed(`Found ${lintDiagnostics.length} lint issues`);
      } catch (error) {
        if (!scoreOnly) spinner.fail("Lint check failed");
      }
    }
  }

  // Run dead code detection
  if (deadCode) {
    if (!scoreOnly) spinner.start("Detecting dead code...");
    try {
      const knipDiagnostics = await runKnip(rootDirectory);
      diagnostics.push(...knipDiagnostics);
      if (!scoreOnly) spinner.succeed(`Found ${knipDiagnostics.length} dead code issues`);
    } catch (error) {
      if (!scoreOnly) spinner.fail("Dead code detection failed");
    }
  }

  // Filter ignored diagnostics
  const filteredDiagnostics = filterIgnoredDiagnostics(diagnostics, config);

  // Calculate score
  const scoreResult = calculateScore(filteredDiagnostics);
  const elapsedMs = performance.now() - startTime;

  if (scoreOnly) {
    logger.log(String(scoreResult.score));
    return { diagnostics: filteredDiagnostics, score: scoreResult };
  }

  logger.break();

  // Print diagnostics
  if (filteredDiagnostics.length > 0) {
    printDiagnostics(filteredDiagnostics, verbose);
  } else {
    logger.success("  No issues found!");
    logger.break();
  }

  // Print summary
  printSummary(
    scoreResult,
    filteredDiagnostics.length,
    elapsedMs,
    project.projectName,
    formatFrameworkName(project.framework),
    project.vueVersion,
  );

  return { diagnostics: filteredDiagnostics, score: scoreResult };
};
