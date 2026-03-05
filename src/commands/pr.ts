import path from "path";

import { analyzeRepo } from "@agentrc/core/services/analyzer";
import {
  createPullRequest as createAzurePullRequest,
  getAzureDevOpsToken,
  getRepo as getAzureRepo
} from "@agentrc/core/services/azureDevops";
import { sanitizeError } from "@agentrc/core/services/batch";
import { generateConfigs } from "@agentrc/core/services/generator";
import {
  buildAuthedUrl,
  checkoutBranch,
  cloneRepo,
  commitAll,
  isGitRepo,
  pushBranch,
  setRemoteUrl
} from "@agentrc/core/services/git";
import { createPullRequest, getRepo, getGitHubToken } from "@agentrc/core/services/github";
import { generateCopilotInstructions } from "@agentrc/core/services/instructions";
import { ensureDir, safeWriteFile, validateCachePath } from "@agentrc/core/utils/fs";
import type { CommandResult } from "@agentrc/core/utils/output";
import {
  outputResult,
  outputError,
  createProgressReporter,
  shouldLog
} from "@agentrc/core/utils/output";
import { buildFullPrBody } from "@agentrc/core/utils/pr";
import { GITHUB_REPO_RE, AZURE_REPO_RE } from "@agentrc/core/utils/repo";

const DEFAULT_PR_BRANCH = "agentrc/add-ai-config";

type PrOptions = {
  branch?: string;
  provider?: string;
  model?: string;
  json?: boolean;
  quiet?: boolean;
};

export async function prCommand(repo: string | undefined, options: PrOptions): Promise<void> {
  const provider = options.provider ?? "github";
  const progress = createProgressReporter(!shouldLog(options));

  if (provider !== "github" && provider !== "azure") {
    outputError("Invalid provider. Use github or azure.", Boolean(options.json));
    return;
  }

  if (!repo) {
    outputError(
      "Provide a repo identifier (github: owner/name, azure: org/project/repo).",
      Boolean(options.json)
    );
    return;
  }

  if (provider === "azure") {
    const token = getAzureDevOpsToken();
    if (!token) {
      outputError(
        "Set AZURE_DEVOPS_PAT (or AZDO_PAT) to use Azure DevOps PR automation.",
        Boolean(options.json)
      );
      return;
    }

    const match = repo.match(AZURE_REPO_RE);
    if (!match) {
      outputError("Invalid Azure DevOps repo format. Use org/project/repo.", Boolean(options.json));
      return;
    }
    const [, organization, project, name] = match;

    try {
      progress.update("Fetching repo info...");
      const repoInfo = await getAzureRepo(token, organization, project, name);
      const cacheRoot = path.join(process.cwd(), ".agentrc-cache");
      const repoPath = validateCachePath(cacheRoot, organization, project, name);
      await ensureDir(repoPath);

      if (!(await isGitRepo(repoPath))) {
        progress.update("Cloning...");
        const authedUrl = buildAuthedUrl(repoInfo.cloneUrl, token, "azure");
        await cloneRepo(authedUrl, repoPath);
        await setRemoteUrl(repoPath, repoInfo.cloneUrl);
      }

      const branch = options.branch ?? DEFAULT_PR_BRANCH;
      progress.update("Creating branch...");
      await checkoutBranch(repoPath, branch);

      progress.update("Generating instructions...");
      const instructions = await generateCopilotInstructions({ repoPath, model: options.model });
      const instructionsPath = path.join(repoPath, ".github", "copilot-instructions.md");
      await ensureDir(path.dirname(instructionsPath));
      const { wrote, reason } = await safeWriteFile(instructionsPath, instructions, true);
      if (!wrote) {
        throw new Error(
          `Refused to write instructions (${reason === "symlink" ? "path is a symlink" : "file exists"})`
        );
      }

      progress.update("Analyzing...");
      const analysis = await analyzeRepo(repoPath);
      progress.update("Generating configs...");
      await generateConfigs({
        repoPath,
        analysis,
        selections: ["mcp", "vscode"],
        force: true
      });

      progress.update("Committing...");
      await commitAll(repoPath, "chore: add AI configurations via AgentRC");
      progress.update("Pushing...");
      await pushBranch(repoPath, branch, token, "azure");

      progress.update("Creating PR...");
      const prUrl = await createAzurePullRequest({
        token,
        organization,
        project,
        repoId: repoInfo.id,
        repoName: repoInfo.name,
        title: "🤖 Prime this repo for AI",
        body: buildFullPrBody(),
        sourceBranch: branch,
        targetBranch: repoInfo.defaultBranch
      });

      if (options.json) {
        const result: CommandResult<{ repo: string; branch: string; prUrl: string }> = {
          ok: true,
          status: "success",
          data: { repo, branch, prUrl }
        };
        outputResult(result, true);
      } else {
        progress.succeed(`Created PR: ${prUrl}`);
      }
    } catch (error) {
      outputError(
        sanitizeError(`PR failed: ${error instanceof Error ? error.message : String(error)}`),
        Boolean(options.json)
      );
    }
    return;
  }

  // GitHub provider
  const token = await getGitHubToken();
  if (!token) {
    outputError(
      "Set GITHUB_TOKEN or GH_TOKEN, or authenticate with GitHub CLI.",
      Boolean(options.json)
    );
    return;
  }

  const match = repo.match(GITHUB_REPO_RE);
  if (!match) {
    outputError("Invalid repo format. Use owner/name.", Boolean(options.json));
    return;
  }
  const [, owner, name] = match;

  try {
    progress.update("Fetching repo info...");
    const repoInfo = await getRepo(token, owner, name);
    const cacheRoot = path.join(process.cwd(), ".agentrc-cache");
    const repoPath = validateCachePath(cacheRoot, owner, name);
    await ensureDir(repoPath);

    if (!(await isGitRepo(repoPath))) {
      progress.update("Cloning...");
      await cloneRepo(repoInfo.cloneUrl, repoPath);
    }

    const branch = options.branch ?? DEFAULT_PR_BRANCH;
    progress.update("Creating branch...");
    await checkoutBranch(repoPath, branch);

    progress.update("Generating instructions...");
    const instructions = await generateCopilotInstructions({ repoPath, model: options.model });
    const instructionsPath = path.join(repoPath, ".github", "copilot-instructions.md");
    await ensureDir(path.dirname(instructionsPath));
    const { wrote, reason } = await safeWriteFile(instructionsPath, instructions, true);
    if (!wrote) {
      throw new Error(
        `Refused to write instructions (${reason === "symlink" ? "path is a symlink" : "file exists"})`
      );
    }

    progress.update("Analyzing...");
    const analysis = await analyzeRepo(repoPath);
    progress.update("Generating configs...");
    await generateConfigs({
      repoPath,
      analysis,
      selections: ["mcp", "vscode"],
      force: true
    });

    progress.update("Committing...");
    await commitAll(repoPath, "chore: add AI configurations via AgentRC");
    progress.update("Pushing...");
    await pushBranch(repoPath, branch, token, "github");

    progress.update("Creating PR...");
    const prUrl = await createPullRequest({
      token,
      owner,
      repo: name,
      title: "🤖 Prime this repo for AI",
      body: buildFullPrBody(),
      head: `${owner}:${branch}`,
      base: repoInfo.defaultBranch
    });

    if (options.json) {
      const result: CommandResult<{ repo: string; branch: string; prUrl: string }> = {
        ok: true,
        status: "success",
        data: { repo, branch, prUrl }
      };
      outputResult(result, true);
    } else {
      progress.succeed(`Created PR: ${prUrl}`);
    }
  } catch (error) {
    outputError(
      sanitizeError(`PR failed: ${error instanceof Error ? error.message : String(error)}`),
      Boolean(options.json)
    );
  }
}
