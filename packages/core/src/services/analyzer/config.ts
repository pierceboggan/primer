import path from "path";

import { readJson } from "../../utils/fs";

export type InstructionStrategy = "flat" | "nested";

export type AgentrcConfigArea = {
  name: string;
  applyTo: string | string[];
  description?: string;
  parentArea?: string;
};

export type AgentrcConfigWorkspace = {
  name: string;
  path: string;
  areas: AgentrcConfigArea[];
};

export type AgentrcConfig = {
  areas?: AgentrcConfigArea[];
  workspaces?: AgentrcConfigWorkspace[];
  policies?: string[];
  strategy?: InstructionStrategy;
  detailDir?: string;
  claudeMd?: boolean;
};

function parseConfigAreas(raw: unknown): AgentrcConfigArea[] {
  if (!Array.isArray(raw)) return [];
  const areas: AgentrcConfigArea[] = [];
  for (const entry of raw) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).name !== "string" ||
      (entry as Record<string, unknown>).applyTo === undefined
    )
      continue;
    const e = entry as Record<string, unknown>;
    if (!(e.name as string).trim()) continue;
    const rawApplyTo = e.applyTo;
    let applyTo: string | string[];
    if (typeof rawApplyTo === "string") {
      applyTo = rawApplyTo;
    } else if (Array.isArray(rawApplyTo) && rawApplyTo.every((v) => typeof v === "string")) {
      applyTo = rawApplyTo as string[];
    } else {
      continue;
    }
    if (
      (typeof applyTo === "string" && !applyTo.trim()) ||
      (Array.isArray(applyTo) && applyTo.length === 0)
    )
      continue;
    const allPatterns = Array.isArray(applyTo) ? applyTo : [applyTo];
    if (allPatterns.some((p) => p.split("/").includes(".."))) continue;
    areas.push({
      name: e.name as string,
      applyTo,
      description: typeof e.description === "string" ? e.description : undefined,
      parentArea: typeof e.parentArea === "string" ? e.parentArea : undefined
    });
  }
  return areas;
}

export async function loadAgentrcConfig(repoPath: string): Promise<AgentrcConfig | undefined> {
  // Try repo root first, then .github/
  const candidates = [
    path.join(repoPath, "agentrc.config.json"),
    path.join(repoPath, ".github", "agentrc.config.json")
  ];

  for (const candidate of candidates) {
    const json = await readJson(candidate);
    if (!json) continue;

    // Validate shape
    if (json.areas !== undefined && !Array.isArray(json.areas)) {
      return undefined;
    }
    const areas = parseConfigAreas(json.areas);

    // Parse policies array
    let policies: string[] | undefined;
    if (Array.isArray(json.policies)) {
      policies = json.policies.filter((p): p is string => typeof p === "string" && p.trim() !== "");
    }

    // Parse strategy
    let strategy: InstructionStrategy | undefined;
    if (typeof json.strategy === "string") {
      const s = json.strategy as string;
      if (s === "flat" || s === "nested") {
        strategy = s;
      }
    }

    // Parse detailDir with safety validation
    let detailDir: string | undefined;
    if (typeof json.detailDir === "string") {
      // Normalize separators so validation works on both Windows and POSIX
      const dir = (json.detailDir as string).trim().replace(/\\+/gu, "/");
      const blocklist = new Set([".git", "node_modules", ".github", "dist", "build"]);
      // Must be a single path segment — no slashes, no traversal, not in blocklist
      if (
        dir &&
        !path.isAbsolute(dir) &&
        !dir.includes("/") &&
        !dir.includes("..") &&
        !blocklist.has(dir)
      ) {
        detailDir = dir;
      }
    }

    // Parse claudeMd
    const claudeMd = json.claudeMd === true ? true : undefined;

    // Parse workspaces array
    const workspaces: AgentrcConfigWorkspace[] = [];
    if (Array.isArray(json.workspaces)) {
      for (const ws of json.workspaces) {
        if (typeof ws !== "object" || ws === null) continue;
        const w = ws as Record<string, unknown>;
        if (typeof w.name !== "string" || !(w.name as string).trim()) continue;
        if (typeof w.path !== "string" || !(w.path as string).trim()) continue;

        const wsPath = (w.path as string).trim().replace(/\\+/gu, "/").replace(/\/+$/u, "");
        if (!wsPath) continue;
        // Must be relative, no traversal, no absolute path, no root
        if (path.isAbsolute(wsPath) || wsPath === "." || wsPath.split("/").includes("..")) continue;

        const wsAreas = parseConfigAreas(w.areas);
        if (wsAreas.length === 0) continue;

        workspaces.push({
          name: (w.name as string).trim(),
          path: wsPath,
          areas: wsAreas
        });
      }
    }

    // Validate parentArea references — flat areas against flat names, workspace areas within their workspace
    const flatNames = new Set(areas.map((a) => a.name.toLowerCase()));
    for (const area of areas) {
      if (area.parentArea && !flatNames.has(area.parentArea.toLowerCase())) {
        area.parentArea = undefined;
      }
    }
    for (const ws of workspaces) {
      const wsAreaNames = new Set(ws.areas.map((a) => a.name.toLowerCase()));
      for (const area of ws.areas) {
        if (area.parentArea && !wsAreaNames.has(area.parentArea.toLowerCase())) {
          area.parentArea = undefined;
        }
      }
    }

    return {
      areas,
      workspaces: workspaces.length ? workspaces : undefined,
      policies: policies?.length ? policies : undefined,
      strategy,
      detailDir,
      claudeMd
    };
  }

  return undefined;
}

export function sanitizeAreaName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
  return sanitized || "unnamed";
}
