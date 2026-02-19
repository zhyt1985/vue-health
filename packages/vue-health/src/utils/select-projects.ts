import fs from "node:fs";
import path from "node:path";
import type { WorkspacePackage } from "../types.js";
import { getWorkspacePackages } from "./discover-project.js";
import { prompts } from "./prompts.js";

export const selectProjects = async (
  rootDirectory: string,
  projectFilter?: string,
  shouldSkipPrompts?: boolean,
): Promise<string[]> => {
  const workspacePackages = getWorkspacePackages(rootDirectory);

  if (workspacePackages.length === 0) {
    return [rootDirectory];
  }

  if (projectFilter) {
    const names = projectFilter.split(",").map((n) => n.trim());
    const matched = workspacePackages.filter((pkg) => names.includes(pkg.name));
    return matched.length > 0 ? matched.map((p) => p.directory) : [rootDirectory];
  }

  if (shouldSkipPrompts) {
    return workspacePackages.map((p) => p.directory);
  }

  const choices = workspacePackages.map((pkg) => ({
    title: pkg.name,
    value: pkg.directory,
    selected: true,
  }));

  const { selectedProjects } = await prompts({
    type: "multiselect",
    name: "selectedProjects",
    message: "Select workspace projects to scan",
    choices,
  });

  if (!selectedProjects || selectedProjects.length === 0) {
    return [rootDirectory];
  }

  return selectedProjects;
};
