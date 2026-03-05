import path from "path";

import { safeReadDir } from "../../utils/fs";

import { isScannableDirectory } from "./apps";
import { areasFromHeuristics } from "./areas";
import type { AgentrcConfigArea, AgentrcConfigWorkspace } from "./config";
import type { Area } from "./types";

const WORKSPACE_SCAN_MAX_DEPTH = 3;
const WORKSPACE_SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  "target",
  "build",
  "dist",
  "out",
  "vendor",
  "coverage",
  "__pycache__",
  ".cache"
]);

/**
 * Detect workspaces by scanning for `.vscode` folders (indicating directories
 * that developers open as VS Code workspaces) and by grouping auto-detected
 * areas that share a common parent directory.
 */
export async function detectWorkspaces(
  repoPath: string,
  areas: Area[]
): Promise<AgentrcConfigWorkspace[]> {
  const resolvedRoot = path.resolve(repoPath);
  const workspaces = new Map<string, AgentrcConfigWorkspace>();

  // Strategy 1: Scan for .vscode folders as workspace markers
  const vscodeDirs = await findVSCodeDirs(repoPath, repoPath, WORKSPACE_SCAN_MAX_DEPTH);
  for (const vsDir of vscodeDirs) {
    // The workspace is the parent of the .vscode folder
    const wsAbs = path.dirname(vsDir);
    const wsRel = path.relative(repoPath, wsAbs).replace(/\\/gu, "/");
    if (!wsRel || wsRel === ".") continue; // skip repo root

    const wsResolved = path.resolve(wsAbs);
    if (!wsResolved.startsWith(resolvedRoot + path.sep)) continue;

    // Find areas that fall within this workspace
    const wsAreas = areasWithinDir(wsRel, areas);
    if (wsAreas.length === 0) {
      // Run heuristic detection scoped to this workspace directory
      const scopedAreas = await areasFromHeuristics(wsAbs);
      if (scopedAreas.length === 0) continue;
      const configAreas = scopedAreas.map((a) => ({
        name: a.name,
        applyTo: Array.isArray(a.applyTo) ? a.applyTo : a.applyTo,
        description: a.description
      }));
      workspaces.set(wsRel, { name: path.basename(wsRel), path: wsRel, areas: configAreas });
    } else {
      const configAreas = wsAreas.map((a) => toWorkspaceRelativeArea(wsRel, a));
      workspaces.set(wsRel, { name: path.basename(wsRel), path: wsRel, areas: configAreas });
    }
  }

  // Strategy 2: Group areas by common parent directory (2+ siblings → workspace)
  const parentGroups = new Map<string, Area[]>();
  for (const area of areas) {
    if (!area.path) continue;
    const rel = path.relative(repoPath, area.path).replace(/\\/gu, "/");
    const segments = rel.split("/");
    if (segments.length < 2) continue; // top-level dir — not a nested workspace

    const parentRel = segments.slice(0, -1).join("/");
    if (workspaces.has(parentRel)) continue; // already found via .vscode

    if (!parentGroups.has(parentRel)) parentGroups.set(parentRel, []);
    parentGroups.get(parentRel)!.push(area);
  }

  for (const [parentRel, grouped] of parentGroups) {
    if (grouped.length < 2) continue;

    const parentAbs = path.resolve(repoPath, parentRel);
    const parentResolved = path.resolve(parentAbs);
    if (!parentResolved.startsWith(resolvedRoot + path.sep)) continue;

    const configAreas = grouped.map((a) => toWorkspaceRelativeArea(parentRel, a));
    workspaces.set(parentRel, {
      name: path.basename(parentRel),
      path: parentRel,
      areas: configAreas
    });
  }

  return Array.from(workspaces.values());
}

async function findVSCodeDirs(
  repoPath: string,
  dir: string,
  maxDepth: number,
  depth = 0
): Promise<string[]> {
  if (depth >= maxDepth) return [];
  const results: string[] = [];
  let entries: string[];
  try {
    entries = await safeReadDir(dir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry === ".vscode") {
      results.push(path.join(dir, entry));
      continue;
    }
    if (entry.startsWith(".") || WORKSPACE_SKIP_DIRS.has(entry)) continue;
    const fullPath = path.join(dir, entry);
    if (await isScannableDirectory(repoPath, fullPath)) {
      results.push(...(await findVSCodeDirs(repoPath, fullPath, maxDepth, depth + 1)));
    }
  }

  return results;
}

function areasWithinDir(wsRel: string, areas: Area[]): Area[] {
  const prefix = wsRel + "/";
  return areas.filter((a) => {
    const patterns = Array.isArray(a.applyTo) ? a.applyTo : [a.applyTo];
    return patterns.some((p) => p.startsWith(prefix));
  });
}

function toWorkspaceRelativeArea(wsRel: string, area: Area): AgentrcConfigArea {
  const prefix = wsRel + "/";
  const patterns = Array.isArray(area.applyTo) ? area.applyTo : [area.applyTo];
  const relPatterns = patterns.map((p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p));
  return {
    name: area.name,
    applyTo: relPatterns.length === 1 ? relPatterns[0] : relPatterns,
    description: area.description
  };
}
