import fs from "fs/promises";
import path from "path";

import { safeReadDir, readJson } from "../../utils/fs";

import {
  detectFrameworks,
  detectNonJsMonorepo,
  detectPackageManager,
  detectWorkspace,
  resolveWorkspaceApps
} from "./apps";
import { detectAreas, unique } from "./areas";
import type { RepoAnalysis } from "./types";

// ── Re-exports: keep the public API surface identical ──
export type { RepoApp, Area, RepoAnalysis } from "./types";
export { PACKAGE_MANAGERS } from "./types";
export { detectWorkspaces } from "./workspaces";
export { loadAgentrcConfig, sanitizeAreaName } from "./config";
export type {
  InstructionStrategy,
  AgentrcConfigArea,
  AgentrcConfigWorkspace,
  AgentrcConfig
} from "./config";
export { detectAreas } from "./areas";

export async function analyzeRepo(repoPath: string): Promise<RepoAnalysis> {
  const files = await safeReadDir(repoPath);
  let isGit = false;
  try {
    await fs.access(path.join(repoPath, ".git"));
    isGit = true;
  } catch {
    // not a git repo
  }
  const analysis: RepoAnalysis = {
    path: repoPath,
    isGitRepo: isGit,
    languages: [],
    frameworks: []
  };

  const hasPackageJson = files.includes("package.json");
  const hasTsConfig = files.includes("tsconfig.json");
  const hasPyProject = files.includes("pyproject.toml");
  const hasRequirements = files.includes("requirements.txt");
  const hasGoMod = files.includes("go.mod");
  const hasCargo = files.includes("Cargo.toml");
  const hasCsproj = files.some(
    (f) => f.endsWith(".csproj") || f.endsWith(".sln") || f.endsWith(".slnx")
  );
  const hasPomXml = files.includes("pom.xml");
  const hasBuildGradle = files.includes("build.gradle") || files.includes("build.gradle.kts");
  const hasGemfile = files.includes("Gemfile");
  const hasComposerJson = files.includes("composer.json");
  const hasCMakeLists = files.includes("CMakeLists.txt");
  const hasMakefile = files.includes("Makefile") || files.includes("GNUmakefile");
  const hasMesonBuild = files.includes("meson.build");
  const hasConfigure = files.includes("configure") || files.includes("configure.ac");
  const hasMozBuild = files.includes("moz.build");

  if (hasPackageJson) analysis.languages.push("JavaScript");
  if (hasTsConfig) analysis.languages.push("TypeScript");
  if (hasPyProject || hasRequirements) analysis.languages.push("Python");
  if (hasGoMod) analysis.languages.push("Go");
  if (hasCargo) analysis.languages.push("Rust");
  if (hasCsproj) analysis.languages.push("C#");
  if (hasPomXml || hasBuildGradle) analysis.languages.push("Java");
  if (hasGemfile) analysis.languages.push("Ruby");
  if (hasComposerJson) analysis.languages.push("PHP");
  if (hasCMakeLists || hasMesonBuild || hasConfigure || hasMozBuild) analysis.languages.push("C++");
  if (hasMakefile && !analysis.languages.length) analysis.languages.push("C");

  analysis.packageManager = await detectPackageManager(repoPath, files);

  let rootPackageJson: Record<string, unknown> | undefined;

  if (hasPackageJson) {
    rootPackageJson = await readJson(path.join(repoPath, "package.json"));
    const deps = Object.keys({
      ...(rootPackageJson?.dependencies ?? {}),
      ...(rootPackageJson?.devDependencies ?? {})
    });
    analysis.frameworks.push(...detectFrameworks(deps, files));
  }

  const workspace = await detectWorkspace(repoPath, files, rootPackageJson);
  if (workspace) {
    analysis.workspaceType = workspace.type;
    analysis.workspacePatterns = workspace.patterns;
  }

  let apps = await resolveWorkspaceApps(repoPath, workspace?.patterns ?? [], rootPackageJson);

  // If JS workspace didn't find multiple apps, try non-JS monorepo detection
  if (apps.length <= 1) {
    const nonJs = await detectNonJsMonorepo(repoPath, files);
    if (nonJs.apps.length > 1) {
      apps = nonJs.apps;
      if (nonJs.type) analysis.workspaceType = nonJs.type;
      if (nonJs.patterns) analysis.workspacePatterns = nonJs.patterns;
    }
  }

  if (workspace && files.includes("turbo.json") && apps.length > 1) {
    analysis.workspaceType = "turborepo";
  }

  if (files.includes("nx.json") && apps.length > 1 && analysis.workspaceType !== "turborepo") {
    analysis.workspaceType = "nx";
  }

  analysis.apps = apps;
  analysis.isMonorepo = apps.length > 1;

  analysis.languages = unique(analysis.languages);
  analysis.frameworks = unique(analysis.frameworks);

  // Detect areas from apps and folder heuristics
  analysis.areas = await detectAreas(repoPath, analysis);

  return analysis;
}
