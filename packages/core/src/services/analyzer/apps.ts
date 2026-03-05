import fs from "fs/promises";
import path from "path";

import fg from "fast-glob";

import { fileExists, safeReadDir, readJson } from "../../utils/fs";

import type { RepoApp, RepoAnalysis } from "./types";
import { PACKAGE_MANAGERS } from "./types";

export async function detectPackageManager(
  _repoPath: string,
  files: string[]
): Promise<string | undefined> {
  for (const manager of PACKAGE_MANAGERS) {
    if (files.includes(manager.file)) return manager.name;
  }

  if (files.includes("package.json")) return "npm";
  if (files.includes("pyproject.toml")) return "pip";
  if (files.includes("Cargo.toml")) return "cargo";
  if (files.includes("go.mod")) return "go";
  if (files.includes("pom.xml")) return "maven";
  if (files.includes("build.gradle") || files.includes("build.gradle.kts")) return "gradle";
  if (files.includes("Gemfile")) return "bundler";
  if (files.includes("composer.json")) return "composer";
  if (files.some((f) => f.endsWith(".sln") || f.endsWith(".slnx"))) return "nuget";
  if (
    files.includes("MODULE.bazel") ||
    files.includes("WORKSPACE") ||
    files.includes("WORKSPACE.bazel")
  )
    return "bazel";
  if (files.includes("pants.toml")) return "pants";
  if (files.includes("nx.json")) return "nx";
  return undefined;
}

export function detectFrameworks(deps: string[], files: string[]): string[] {
  const frameworks: string[] = [];
  const hasFile = (file: string): boolean => files.includes(file);

  if (deps.includes("next") || hasFile("next.config.js") || hasFile("next.config.mjs"))
    frameworks.push("Next.js");
  if (deps.includes("react") || deps.includes("react-dom")) frameworks.push("React");
  if (deps.includes("vue") || hasFile("vue.config.js")) frameworks.push("Vue");
  if (deps.includes("@angular/core") || hasFile("angular.json")) frameworks.push("Angular");
  if (deps.includes("svelte") || hasFile("svelte.config.js")) frameworks.push("Svelte");
  if (deps.includes("express")) frameworks.push("Express");
  if (deps.includes("@nestjs/core")) frameworks.push("NestJS");
  if (deps.includes("fastify")) frameworks.push("Fastify");

  return frameworks;
}

async function safeReadFile(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

export async function isScannableDirectory(
  repoPath: string,
  candidatePath: string
): Promise<boolean> {
  try {
    const stat = await fs.lstat(candidatePath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return false;

    const resolvedRoot = await fs.realpath(repoPath).catch(() => path.resolve(repoPath));
    const resolvedCandidate = await fs
      .realpath(candidatePath)
      .catch(() => path.resolve(candidatePath));

    return (
      resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep)
    );
  } catch {
    return false;
  }
}

type WorkspaceConfig = {
  type: "npm" | "pnpm" | "yarn";
  patterns: string[];
};

export async function detectWorkspace(
  repoPath: string,
  files: string[],
  packageJson?: Record<string, unknown>
): Promise<WorkspaceConfig | undefined> {
  if (files.includes("pnpm-workspace.yaml")) {
    const patterns = await readPnpmWorkspace(path.join(repoPath, "pnpm-workspace.yaml"));
    if (patterns.length) return { type: "pnpm", patterns };
  }

  const workspaces = packageJson?.workspaces;
  if (Array.isArray(workspaces)) {
    return { type: files.includes("yarn.lock") ? "yarn" : "npm", patterns: workspaces.map(String) };
  }

  if (workspaces && typeof workspaces === "object") {
    const packages = (workspaces as { packages?: unknown }).packages;
    if (Array.isArray(packages)) {
      return { type: files.includes("yarn.lock") ? "yarn" : "npm", patterns: packages.map(String) };
    }
  }

  return undefined;
}

async function readPnpmWorkspace(filePath: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/u);
    const patterns: string[] = [];
    let inPackages = false;
    for (const line of lines) {
      // Skip comment-only lines
      if (/^\s*#/u.test(line)) continue;
      if (!inPackages && /^\s*packages\s*:/u.test(line)) {
        // Handle inline array: packages: ["apps/*", "libs/*"]
        const inline = line.match(/packages\s*:\s*\[([^\]]+)\]/u);
        if (inline) {
          const items = inline[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/gu, ""));
          return items.filter(Boolean);
        }
        inPackages = true;
        continue;
      }
      if (inPackages) {
        const match = line.match(/^\s*-\s*(.+)$/u);
        if (match?.[1]) {
          // Strip trailing comments and quotes
          const value = match[1]
            .split("#")[0]
            .trim()
            .replace(/^['"]|['"]$/gu, "");
          if (value) patterns.push(value);
          continue;
        }
        // Non-indented, non-empty line means a new top-level key
        if (/^\S/u.test(line) && line.trim()) break;
      }
    }
    return patterns;
  } catch {
    return [];
  }
}

export async function resolveWorkspaceApps(
  repoPath: string,
  patterns: string[],
  rootPackageJson?: Record<string, unknown>
): Promise<RepoApp[]> {
  const workspacePatterns = patterns
    .map((pattern) => pattern.replace(/\\/gu, "/"))
    .map((pattern) =>
      pattern.endsWith("package.json") ? pattern : path.posix.join(pattern, "package.json")
    );

  const packageJsonPaths = workspacePatterns.length
    ? (
        await fg(workspacePatterns, { cwd: repoPath, absolute: true, onlyFiles: true, dot: false })
      ).map((p) => path.normalize(p))
    : [];

  if (!packageJsonPaths.length && rootPackageJson) {
    const rootPath = path.join(repoPath, "package.json");
    return [await buildRepoApp(repoPath, rootPath, rootPackageJson)];
  }

  const apps = await Promise.all(
    packageJsonPaths.map(async (pkgPath) => {
      const pkg = await readJson(pkgPath);
      return buildRepoApp(path.dirname(pkgPath), pkgPath, pkg);
    })
  );

  return apps.filter(Boolean) as RepoApp[];
}

async function buildRepoApp(
  appPath: string,
  packageJsonPath: string,
  packageJson?: Record<string, unknown>
): Promise<RepoApp> {
  const scripts = (packageJson?.scripts ?? {}) as Record<string, string>;
  const name = typeof packageJson?.name === "string" ? packageJson.name : path.basename(appPath);
  const hasTsConfig = await fileExists(path.join(appPath, "tsconfig.json"));

  return {
    name,
    path: appPath,
    ecosystem: "node",
    manifestPath: packageJsonPath,
    packageJsonPath,
    scripts,
    hasTsConfig
  };
}

function buildNonJsApp(
  name: string,
  appPath: string,
  ecosystem: RepoApp["ecosystem"],
  manifestPath: string
): RepoApp {
  return {
    name,
    path: appPath,
    ecosystem,
    manifestPath,
    packageJsonPath: "",
    scripts: {},
    hasTsConfig: false
  };
}

// ─── Non-JS monorepo detection ───

type NonJsMonorepoResult = {
  type?: RepoAnalysis["workspaceType"];
  patterns?: string[];
  apps: RepoApp[];
};

export async function detectNonJsMonorepo(
  repoPath: string,
  files: string[]
): Promise<NonJsMonorepoResult> {
  const cargoApps = await detectCargoWorkspace(repoPath);
  if (cargoApps.length > 1) return { type: "cargo", apps: cargoApps };

  const goApps = await detectGoWorkspace(repoPath);
  if (goApps.length > 1) return { type: "go", apps: goApps };

  const dotnetApps = await detectDotnetSolution(repoPath, files);
  if (dotnetApps.length > 1) return { type: "dotnet", apps: dotnetApps };

  const gradleApps = await detectGradleMultiProject(repoPath, files);
  if (gradleApps.length > 1) return { type: "gradle", apps: gradleApps };

  const mavenApps = await detectMavenMultiModule(repoPath);
  if (mavenApps.length > 1) return { type: "maven", apps: mavenApps };

  const bazelApps = await detectBazelWorkspace(repoPath, files);
  if (bazelApps.length > 1) return { type: "bazel", apps: bazelApps };

  const nxApps = await detectNxWorkspace(repoPath, files);
  if (nxApps.length > 1) return { type: "nx", apps: nxApps };

  const pantsApps = await detectPantsWorkspace(repoPath, files);
  if (pantsApps.length > 1) return { type: "pants", apps: pantsApps };

  return { apps: [] };
}

async function detectCargoWorkspace(repoPath: string): Promise<RepoApp[]> {
  const content = await safeReadFile(path.join(repoPath, "Cargo.toml"));
  if (!content) return [];

  // Extract [workspace] section up to the next section header
  const workspaceSection = content.match(/\[workspace\]([\s\S]*?)(?:\n\[|$)/u);
  if (!workspaceSection) return [];

  const membersMatch = workspaceSection[1].match(/members\s*=\s*\[([\s\S]*?)\]/u);
  if (!membersMatch) return [];

  const patterns = [...membersMatch[1].matchAll(/"([^"]+)"/gu)].map((m) => m[1]);
  if (!patterns.length) return [];

  const tomlPaths = (
    await fg(
      patterns.map((p) => path.posix.join(p, "Cargo.toml")),
      { cwd: repoPath, absolute: true, onlyFiles: true }
    )
  ).map((p) => path.normalize(p));

  return Promise.all(
    tomlPaths.map(async (tomlPath) => {
      const dir = path.dirname(tomlPath);
      const toml = await safeReadFile(tomlPath);
      const nameMatch = toml?.match(/^\s*name\s*=\s*"([^"]+)"/mu);
      return buildNonJsApp(nameMatch?.[1] ?? path.basename(dir), dir, "rust", tomlPath);
    })
  );
}

async function detectGoWorkspace(repoPath: string): Promise<RepoApp[]> {
  const content = await safeReadFile(path.join(repoPath, "go.work"));
  if (!content) return [];

  const modules: string[] = [];

  // Block form: use ( ./cmd/server \n ./pkg/lib )
  const blockMatch = content.match(/use\s*\(([\s\S]*?)\)/u);
  if (blockMatch) {
    for (const line of blockMatch[1].split(/\r?\n/u)) {
      const trimmed = line.replace(/\/\/.*$/u, "").trim();
      if (trimmed) modules.push(trimmed);
    }
  }

  // Single-line form: use ./cmd/server
  for (const match of content.matchAll(/^use\s+(\S+)\s*$/gmu)) {
    modules.push(match[1]);
  }

  const apps: RepoApp[] = [];
  for (const mod of modules) {
    const modPath = path.resolve(repoPath, mod);
    const goModPath = path.join(modPath, "go.mod");
    if (!(await fileExists(goModPath))) continue;

    const goMod = await safeReadFile(goModPath);
    const nameMatch = goMod?.match(/^module\s+(\S+)/mu);
    const shortName = nameMatch?.[1]?.split("/").pop() ?? path.basename(modPath);
    apps.push(buildNonJsApp(shortName, modPath, "go", goModPath));
  }

  return apps;
}

async function detectDotnetSolution(repoPath: string, files: string[]): Promise<RepoApp[]> {
  // Prefer .slnx (newer XML format) over .sln (legacy text format)
  const slnxFile = files.find((f) => f.endsWith(".slnx"));
  if (slnxFile) {
    return detectSlnxProjects(repoPath, slnxFile);
  }

  const slnFile = files.find((f) => f.endsWith(".sln"));
  if (!slnFile) return [];

  const content = await safeReadFile(path.join(repoPath, slnFile));
  if (!content) return [];

  // Match: Project("{guid}") = "Name", "path\to\Project.csproj", "{guid}"
  const projectRegex = /Project\("[^"]*"\)\s*=\s*"([^"]+)",\s*"([^"]+\.(?:cs|fs|vb)proj)"/giu;
  const apps: RepoApp[] = [];

  for (const match of content.matchAll(projectRegex)) {
    const name = match[1];
    const projRelPath = match[2].replace(/\\/gu, "/");
    const projPath = path.resolve(repoPath, projRelPath);
    const appDir = path.dirname(projPath);

    if (await fileExists(projPath)) {
      apps.push(buildNonJsApp(name, appDir, "dotnet", projPath));
    }
  }

  return apps;
}

async function detectSlnxProjects(repoPath: string, slnxFile: string): Promise<RepoApp[]> {
  const content = await safeReadFile(path.join(repoPath, slnxFile));
  if (!content) return [];

  // Match: <Project Path="path/to/Project.csproj" /> (with optional extra attributes)
  const projectRegex = /<Project\s[^>]*Path="([^"]+\.(?:cs|fs|vb)proj)"[^>]*\/>/giu;
  const apps: RepoApp[] = [];

  for (const match of content.matchAll(projectRegex)) {
    const projRelPath = match[1].replace(/\\/gu, "/");
    const projPath = path.resolve(repoPath, projRelPath);
    const appDir = path.dirname(projPath);
    const name = path.basename(appDir);

    if (await fileExists(projPath)) {
      apps.push(buildNonJsApp(name, appDir, "dotnet", projPath));
    }
  }

  return apps;
}

async function detectGradleMultiProject(repoPath: string, files: string[]): Promise<RepoApp[]> {
  const settingsFile = files.includes("settings.gradle.kts")
    ? "settings.gradle.kts"
    : files.includes("settings.gradle")
      ? "settings.gradle"
      : null;
  if (!settingsFile) return [];

  const content = await safeReadFile(path.join(repoPath, settingsFile));
  if (!content) return [];

  // Extract all Gradle project references (':app', ':lib:core') from the file
  const projectNames: string[] = [];
  for (const match of content.matchAll(/['"](:(?:[\w.-]+:)*[\w.-]+)['"]/gu)) {
    projectNames.push(match[1].replace(/^:/u, "").replace(/:/gu, "/"));
  }

  const uniqueProjects = [...new Set(projectNames)];
  const apps: RepoApp[] = [];

  for (const project of uniqueProjects) {
    const projectDir = path.resolve(repoPath, project);
    const ktsPath = path.join(projectDir, "build.gradle.kts");
    const groovyPath = path.join(projectDir, "build.gradle");

    const buildFile = (await fileExists(ktsPath))
      ? ktsPath
      : (await fileExists(groovyPath))
        ? groovyPath
        : null;

    if (buildFile) {
      apps.push(buildNonJsApp(path.basename(project), projectDir, "java", buildFile));
    }
  }

  return apps;
}

async function detectMavenMultiModule(repoPath: string): Promise<RepoApp[]> {
  const content = await safeReadFile(path.join(repoPath, "pom.xml"));
  if (!content) return [];

  const apps: RepoApp[] = [];
  for (const match of content.matchAll(/<module>([^<]+)<\/module>/gu)) {
    const modName = match[1].trim();
    const modDir = path.resolve(repoPath, modName);
    const pomPath = path.join(modDir, "pom.xml");

    if (await fileExists(pomPath)) {
      apps.push(buildNonJsApp(path.basename(modName), modDir, "java", pomPath));
    }
  }

  return apps;
}

async function detectBazelWorkspace(repoPath: string, files: string[]): Promise<RepoApp[]> {
  const hasBazel =
    files.includes("MODULE.bazel") ||
    files.includes("WORKSPACE") ||
    files.includes("WORKSPACE.bazel");
  if (!hasBazel) return [];

  // Scan first-level directories for BUILD / BUILD.bazel files
  const entries = await safeReadDir(repoPath);
  const apps: RepoApp[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = path.join(repoPath, entry);
    if (!(await isScannableDirectory(repoPath, fullPath))) continue;
    const children = await safeReadDir(fullPath);
    const buildFile = children.includes("BUILD")
      ? "BUILD"
      : children.includes("BUILD.bazel")
        ? "BUILD.bazel"
        : undefined;
    if (!buildFile) continue;

    apps.push(buildNonJsApp(entry, fullPath, undefined, path.join(fullPath, buildFile)));
  }

  return apps;
}

async function detectNxWorkspace(repoPath: string, files: string[]): Promise<RepoApp[]> {
  if (!files.includes("nx.json")) return [];

  // Find project.json files (depth-limited via glob pattern)
  const projectJsonPaths = (
    await fg(["*/project.json", "*/*/project.json", "*/*/*/project.json"], {
      cwd: repoPath,
      absolute: true,
      onlyFiles: true,
      dot: false,
      followSymbolicLinks: false,
      ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**", "**/build/**", "**/out/**"]
    })
  ).map((p) => path.normalize(p));

  const apps: RepoApp[] = [];
  for (const projPath of projectJsonPaths) {
    const projDir = path.dirname(projPath);
    const projJson = await readJson(projPath);
    const name = typeof projJson?.name === "string" ? projJson.name : path.basename(projDir);
    // Detect ecosystem from sibling files
    const children = await safeReadDir(projDir);
    const ecosystem: RepoApp["ecosystem"] = children.includes("package.json")
      ? "node"
      : children.includes("Cargo.toml")
        ? "rust"
        : children.includes("go.mod")
          ? "go"
          : children.includes("pyproject.toml")
            ? "python"
            : undefined;
    apps.push({
      name,
      path: projDir,
      ecosystem,
      manifestPath: projPath,
      packageJsonPath: children.includes("package.json") ? path.join(projDir, "package.json") : "",
      scripts: {},
      hasTsConfig: children.includes("tsconfig.json")
    });
  }

  return apps;
}

async function detectPantsWorkspace(repoPath: string, files: string[]): Promise<RepoApp[]> {
  if (!files.includes("pants.toml")) return [];

  // Scan first-level directories for BUILD files
  const entries = await safeReadDir(repoPath);
  const apps: RepoApp[] = [];

  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const fullPath = path.join(repoPath, entry);
    if (!(await isScannableDirectory(repoPath, fullPath))) continue;
    const children = await safeReadDir(fullPath);
    const buildFile = children.includes("BUILD")
      ? "BUILD"
      : children.includes("BUILD.pants")
        ? "BUILD.pants"
        : undefined;
    if (!buildFile) continue;

    // Infer ecosystem from sibling files
    const ecosystem: RepoApp["ecosystem"] = children.includes("pyproject.toml")
      ? "python"
      : children.includes("go.mod")
        ? "go"
        : children.includes("Cargo.toml")
          ? "rust"
          : undefined;
    apps.push(buildNonJsApp(entry, fullPath, ecosystem, path.join(fullPath, buildFile)));
  }

  return apps;
}
