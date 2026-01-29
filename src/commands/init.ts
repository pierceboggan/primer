import path from "path";
import fs from "fs/promises";
import { checkbox, select } from "@inquirer/prompts";
import { analyzeRepo } from "../services/analyzer";
import { generateConfigs } from "../services/generator";
import { GitHubRepo, listAccessibleRepos } from "../services/github";
import { cloneRepo, isGitRepo } from "../services/git";
import { generateCopilotInstructions } from "../services/instructions";
import { ensureDir } from "../utils/fs";
import { prettyPrintSummary } from "../utils/logger";

type InitOptions = {
  github?: boolean;
  yes?: boolean;
  force?: boolean;
};

export async function initCommand(repoPathArg: string | undefined, options: InitOptions): Promise<void> {
  let repoPath = path.resolve(repoPathArg ?? process.cwd());

  if (options.github) {
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) {
      console.error("Set GITHUB_TOKEN or GH_TOKEN to use GitHub mode.");
      process.exitCode = 1;
      return;
    }

    const repos = await listAccessibleRepos(token);
    if (repos.length === 0) {
      console.error("No accessible repositories found.");
      process.exitCode = 1;
      return;
    }

    const selection = await select<GitHubRepo>({
      message: "Choose a repository",
      choices: repos.map((repo) => ({
        name: `${repo.fullName}${repo.isPrivate ? " (private)" : ""}`,
        value: repo
      }))
    });

    const cacheRoot = path.join(process.cwd(), ".primer-cache");
    repoPath = path.join(cacheRoot, selection.owner, selection.name);
    await ensureDir(repoPath);

    const hasGit = await isGitRepo(repoPath);
    if (!hasGit) {
      await cloneRepo(selection.cloneUrl, repoPath);
    }
  }
  const analysis = await analyzeRepo(repoPath);
  prettyPrintSummary(analysis);

  const selections = options.yes
    ? ["instructions"]
    : await checkbox({
        message: "What would you like to generate?",
        choices: [
          { name: "Custom instructions (.github/copilot-instructions.md)", value: "instructions" },
          { name: "MCP configuration", value: "mcp" },
          { name: "VS Code settings", value: "vscode" },
          { name: "Meta-skills for skill authoring (.github/skills/)", value: "skills" }
        ],
        required: true
      });

  if (selections.includes("instructions")) {
    const outputPath = path.join(repoPath, ".github", "copilot-instructions.md");
    await ensureDir(path.dirname(outputPath));
    const content = await generateCopilotInstructions({ repoPath });
    await fs.writeFile(outputPath, content, "utf8");
    console.log(`Updated ${path.relative(process.cwd(), outputPath)}`);
  }

  const result = await generateConfigs({
    repoPath,
    analysis,
    selections: selections.filter((item) => item !== "instructions"),
    force: Boolean(options.force)
  });

  console.log(result.summary);
}
