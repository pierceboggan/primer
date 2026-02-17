import simpleGit from "simple-git";
import { pushBranch } from "./git.js";

/** File patterns that Primer generates and should be included in PRs. */
export const PRIMER_FILE_PATTERNS = [
  ".github/copilot-instructions.md",
  ".vscode/mcp.json",
  ".vscode/settings.json",
  "AGENTS.md",
  "primer.eval.json"
] as const;

/** Check if a file path is a Primer-generated file. */
export function isPrimerFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return (
    PRIMER_FILE_PATTERNS.some((p) => normalized === p) || normalized.endsWith(".instructions.md")
  );
}

export type RemoteInfo = { owner: string; repo: string };

/**
 * Detect GitHub owner/repo from the origin remote of a local repository.
 * Returns null if no GitHub remote is found.
 */
export async function detectGitHubRemote(repoPath: string): Promise<RemoteInfo | null> {
  const git = simpleGit(repoPath);
  const remotes = await git.getRemotes(true);
  const origin = remotes.find((r) => r.name === "origin");
  if (!origin?.refs.push) return null;

  const match = origin.refs.push.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) return null;

  return { owner: match[1]!, repo: match[2]! };
}

export type BranchInfo = { current: string; defaultBranch: string };

/**
 * Get current branch and the default branch (from origin/HEAD).
 */
export async function getBranchInfo(repoPath: string): Promise<BranchInfo> {
  const git = simpleGit(repoPath);
  const current = (await git.branch()).current;
  const defaultRef = await git
    .raw(["symbolic-ref", "refs/remotes/origin/HEAD", "--short"])
    .catch(() => "origin/main");
  const defaultBranch = defaultRef.replace(/^origin\//, "").trim();
  return { current, defaultBranch };
}

/**
 * Get Primer-generated files from the current git status.
 * Returns the filtered file paths.
 */
export async function getPrimerFilesFromStatus(repoPath: string): Promise<string[]> {
  const git = simpleGit(repoPath);
  const status = await git.status();
  return status.files.map((f) => f.path).filter(isPrimerFile);
}

/**
 * Commit specific files and push to origin.
 */
export async function commitAndPush(
  repoPath: string,
  files: string[],
  message: string,
  branch: string,
  token?: string
): Promise<void> {
  const git = simpleGit(repoPath);
  await git.add(files);
  await git.commit(message);
  await pushBranch(repoPath, branch, token);
}
