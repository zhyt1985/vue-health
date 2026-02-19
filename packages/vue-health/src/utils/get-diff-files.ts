import { execSync } from "node:child_process";
import { SOURCE_FILE_PATTERN, DEFAULT_BRANCH_CANDIDATES } from "../constants.js";
import type { DiffInfo } from "../types.js";

const getCurrentBranch = (rootDirectory: string): string | null => {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: rootDirectory,
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
};

const findBaseBranch = (rootDirectory: string): string | null => {
  for (const candidate of DEFAULT_BRANCH_CANDIDATES) {
    try {
      execSync(`git rev-parse --verify ${candidate}`, {
        cwd: rootDirectory,
        encoding: "utf-8",
        stdio: "pipe",
      });
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
};

const getChangedFiles = (
  rootDirectory: string,
  currentBranch: string,
  baseBranch: string,
): string[] => {
  try {
    const output = execSync(`git diff --name-only ${baseBranch}...${currentBranch}`, {
      cwd: rootDirectory,
      encoding: "utf-8",
    });
    return output
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
};

export const getDiffInfo = (
  rootDirectory: string,
  explicitBaseBranch?: string,
): DiffInfo | null => {
  const currentBranch = getCurrentBranch(rootDirectory);
  if (!currentBranch) return null;

  const baseBranch = explicitBaseBranch ?? findBaseBranch(rootDirectory);
  if (!baseBranch) return null;

  if (currentBranch === baseBranch) return null;

  const changedFiles = getChangedFiles(rootDirectory, currentBranch, baseBranch);
  return { currentBranch, baseBranch, changedFiles };
};

export const filterSourceFiles = (files: string[]): string[] =>
  files.filter((f) => SOURCE_FILE_PATTERN.test(f));
