import { describe, expect, it, vi, afterEach } from "vitest";

import { processBatchReadinessRepo, sanitizeError } from "../batch";
import * as gitModule from "../git";
import type { GitHubRepo } from "../github";
import * as readinessModule from "../readiness";
import type { ReadinessReport } from "../readiness";

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "my-repo",
    owner: "org",
    fullName: "org/my-repo",
    cloneUrl: "https://github.com/org/my-repo.git",
    defaultBranch: "main",
    isPrivate: false,
    ...overrides
  };
}

function makeReport(repoPath: string): ReadinessReport {
  return {
    repoPath,
    generatedAt: new Date().toISOString(),
    isMonorepo: false,
    apps: [],
    pillars: [],
    levels: [],
    criteria: [],
    extras: [],
    achievedLevel: 0
  };
}

describe("processBatchReadinessRepo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns report on success", async () => {
    const repo = makeRepo();
    const report = makeReport("/tmp/repo");

    vi.spyOn(gitModule, "buildAuthedUrl").mockReturnValue(
      "https://x-access-token:tok@github.com/org/my-repo.git"
    );
    vi.spyOn(gitModule, "cloneRepo").mockResolvedValue(undefined);
    vi.spyOn(gitModule, "setRemoteUrl").mockResolvedValue(undefined);
    vi.spyOn(readinessModule, "runReadinessReport").mockResolvedValue(report);

    const result = await processBatchReadinessRepo({
      repo,
      token: "tok",
      repoDir: "/tmp/repo"
    });

    expect(result).toEqual({ repo: "org/my-repo", report });
  });

  it("returns sanitized error when cloneRepo fails", async () => {
    const repo = makeRepo();

    vi.spyOn(gitModule, "buildAuthedUrl").mockReturnValue(
      "https://x-access-token:secret123@github.com/org/my-repo.git"
    );
    vi.spyOn(gitModule, "cloneRepo").mockRejectedValue(
      new Error(
        "fatal: could not read from remote https://x-access-token:secret123@github.com/org/my-repo.git"
      )
    );
    vi.spyOn(gitModule, "setRemoteUrl").mockResolvedValue(undefined);
    vi.spyOn(readinessModule, "runReadinessReport").mockResolvedValue(makeReport("/tmp/repo"));

    const result = await processBatchReadinessRepo({
      repo,
      token: "secret123",
      repoDir: "/tmp/repo"
    });

    expect(result.report).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error).not.toContain("secret123");
    expect(result.error).not.toContain("x-access-token:");
    expect(result.error).toContain("https://***@");
  });

  it("returns sanitized error when runReadinessReport fails", async () => {
    const repo = makeRepo();

    vi.spyOn(gitModule, "buildAuthedUrl").mockReturnValue(
      "https://x-access-token:tok@github.com/org/my-repo.git"
    );
    vi.spyOn(gitModule, "cloneRepo").mockResolvedValue(undefined);
    vi.spyOn(gitModule, "setRemoteUrl").mockResolvedValue(undefined);
    vi.spyOn(readinessModule, "runReadinessReport").mockRejectedValue(new Error("Analysis failed"));

    const result = await processBatchReadinessRepo({
      repo,
      token: "tok",
      repoDir: "/tmp/repo"
    });

    expect(result.repo).toBe("org/my-repo");
    expect(result.report).toBeUndefined();
    expect(result.error).toBe("Analysis failed");
  });

  it("still succeeds when setRemoteUrl fails", async () => {
    const repo = makeRepo();
    const report = makeReport("/tmp/repo");

    vi.spyOn(gitModule, "buildAuthedUrl").mockReturnValue(
      "https://x-access-token:tok@github.com/org/my-repo.git"
    );
    vi.spyOn(gitModule, "cloneRepo").mockResolvedValue(undefined);
    vi.spyOn(gitModule, "setRemoteUrl").mockRejectedValue(new Error("remote update failed"));
    vi.spyOn(readinessModule, "runReadinessReport").mockResolvedValue(report);

    const result = await processBatchReadinessRepo({
      repo,
      token: "tok",
      repoDir: "/tmp/repo"
    });

    // setRemoteUrl failure is swallowed; the report should still be returned
    expect(result).toEqual({ repo: "org/my-repo", report });
  });

  it("calls onProgress with expected messages", async () => {
    const repo = makeRepo();
    const report = makeReport("/tmp/repo");
    const progress = vi.fn();

    vi.spyOn(gitModule, "buildAuthedUrl").mockReturnValue(
      "https://x-access-token:tok@github.com/org/my-repo.git"
    );
    vi.spyOn(gitModule, "cloneRepo").mockResolvedValue(undefined);
    vi.spyOn(gitModule, "setRemoteUrl").mockResolvedValue(undefined);
    vi.spyOn(readinessModule, "runReadinessReport").mockResolvedValue(report);

    await processBatchReadinessRepo({
      repo,
      token: "tok",
      repoDir: "/tmp/repo",
      onProgress: progress
    });

    expect(progress).toHaveBeenCalledWith(expect.stringContaining("org/my-repo"));
  });
});

describe("sanitizeError", () => {
  it("redacts x-access-token credentials", () => {
    expect(sanitizeError("https://x-access-token:ghp_abc123@github.com/org/repo")).toBe(
      "https://***@github.com/org/repo"
    );
  });

  it("redacts PAT credentials", () => {
    expect(sanitizeError("https://pat:mysecret@dev.azure.com/org/project")).toBe(
      "https://***@dev.azure.com/org/project"
    );
  });

  it("leaves strings without credentials unchanged", () => {
    const plain = "fatal: repository not found";
    expect(sanitizeError(plain)).toBe(plain);
  });
});
