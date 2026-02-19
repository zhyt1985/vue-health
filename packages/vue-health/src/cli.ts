import path from "node:path";
import { Command } from "commander";
import { scan } from "./scan.js";
import type { DiffInfo, ScanOptions } from "./types.js";
import { filterSourceFiles, getDiffInfo } from "./utils/get-diff-files.js";
import { handleError } from "./utils/handle-error.js";
import { highlighter } from "./utils/highlighter.js";
import { loadConfig } from "./utils/load-config.js";
import { logger } from "./utils/logger.js";
import { prompts } from "./utils/prompts.js";
import { selectProjects } from "./utils/select-projects.js";

const VERSION = process.env.VERSION ?? "2.0.0";

interface CliFlags {
  lint: boolean;
  deadCode: boolean;
  verbose: boolean;
  score: boolean;
  yes: boolean;
  deep: boolean;
  project?: string;
  diff?: boolean | string;
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const resolveDiffMode = async (
  diffInfo: DiffInfo | null,
  effectiveDiff: boolean | string | undefined,
  shouldSkipPrompts: boolean,
  isScoreOnly: boolean,
): Promise<boolean> => {
  if (effectiveDiff !== undefined && effectiveDiff !== false) {
    if (diffInfo) return true;
    if (!isScoreOnly) {
      logger.warn("Not on a feature branch or could not determine base branch. Running full scan.");
      logger.break();
    }
    return false;
  }
  if (effectiveDiff === false || !diffInfo) return false;
  const changedSourceFiles = filterSourceFiles(diffInfo.changedFiles);
  if (changedSourceFiles.length === 0) return false;
  if (shouldSkipPrompts) return true;
  if (isScoreOnly) return false;
  const { shouldScanBranchOnly } = await prompts({
    type: "confirm",
    name: "shouldScanBranchOnly",
    message: `On branch ${diffInfo.currentBranch} (${changedSourceFiles.length} changed files vs ${diffInfo.baseBranch}). Only scan this branch?`,
    initial: true,
  });
  return Boolean(shouldScanBranchOnly);
};

const program = new Command()
  .name("vue-health")
  .description("Diagnose Vue codebase health")
  .version(VERSION, "-v, --version", "display the version number")
  .argument("[directory]", "project directory to scan", ".")
  .option("--no-lint", "skip linting")
  .option("--no-dead-code", "skip dead code detection")
  .option("--verbose", "show file details per rule")
  .option("--score", "output only the score")
  .option("-y, --yes", "skip prompts, scan all workspace projects")
  .option("--project <names>", "select workspace project (comma-separated)")
  .option("--diff [base]", "scan only files changed vs base branch")
  .option("--deep", "use ESLint deep analysis instead of oxlint")
  .action(async (directory: string, flags: CliFlags) => {
    const isScoreOnly = flags.score;
    try {
      const resolvedDirectory = path.resolve(directory);
      const userConfig = loadConfig(resolvedDirectory);

      if (!isScoreOnly) {
        logger.log(`vue-health v${VERSION}`);
        logger.break();
      }

      const isCliOverride = (optionName: string) =>
        program.getOptionValueSource(optionName) === "cli";

      const scanOptions: ScanOptions = {
        lint: isCliOverride("lint") ? flags.lint : (userConfig?.lint ?? flags.lint),
        deadCode: isCliOverride("deadCode")
          ? flags.deadCode
          : (userConfig?.deadCode ?? flags.deadCode),
        verbose: isCliOverride("verbose")
          ? Boolean(flags.verbose)
          : (userConfig?.verbose ?? false),
        scoreOnly: isScoreOnly,
        deep: Boolean(flags.deep),
      };

      const isAutomatedEnvironment = [
        process.env.CI,
        process.env.CLAUDECODE,
        process.env.CURSOR_AGENT,
        process.env.CODEX_CI,
      ].some(Boolean);

      const shouldSkipPrompts = flags.yes || isAutomatedEnvironment || !process.stdin.isTTY;

      const projectDirectories = await selectProjects(
        resolvedDirectory,
        flags.project,
        shouldSkipPrompts,
      );

      const effectiveDiff = isCliOverride("diff") ? flags.diff : userConfig?.diff;
      const explicitBaseBranch = typeof effectiveDiff === "string" ? effectiveDiff : undefined;
      const diffInfo = getDiffInfo(resolvedDirectory, explicitBaseBranch);
      const isDiffMode = await resolveDiffMode(
        diffInfo,
        effectiveDiff,
        shouldSkipPrompts,
        isScoreOnly ?? false,
      );

      if (isDiffMode && diffInfo && !isScoreOnly) {
        logger.log(
          `Scanning changes: ${highlighter.info(diffInfo.currentBranch)} → ${highlighter.info(diffInfo.baseBranch)}`,
        );
        logger.break();
      }

      for (const projectDirectory of projectDirectories) {
        let includePaths: string[] | undefined;

        if (isDiffMode) {
          const projectDiffInfo = getDiffInfo(projectDirectory, explicitBaseBranch);
          if (projectDiffInfo) {
            const changedSourceFiles = filterSourceFiles(projectDiffInfo.changedFiles);
            if (changedSourceFiles.length === 0) {
              if (!isScoreOnly) {
                logger.dim(`No changed source files in ${projectDirectory}, skipping.`);
                logger.break();
              }
              continue;
            }
            includePaths = changedSourceFiles;
          }
        }

        if (!isScoreOnly) {
          logger.dim(`Scanning ${projectDirectory}...`);
          logger.break();
        }

        await scan(projectDirectory, { ...scanOptions, includePaths });

        if (!isScoreOnly) {
          logger.break();
        }
      }
    } catch (error) {
      handleError(error);
    }
  })
  .addHelpText(
    "after",
    `
${highlighter.dim("Learn more:")}
${highlighter.info("https://github.com/zhyt1985/vue-health")}
`,
  );

const main = async () => {
  await program.parseAsync();
};

main();
