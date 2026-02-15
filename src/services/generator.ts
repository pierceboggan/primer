import path from "path";

import { ensureDir, safeWriteFile } from "../utils/fs";

import type { RepoAnalysis } from "./analyzer";

export type GenerateOptions = {
  repoPath: string;
  analysis: RepoAnalysis;
  selections: string[];
  force: boolean;
};

export async function generateConfigs(options: GenerateOptions): Promise<{ summary: string }> {
  const { repoPath, analysis, selections, force } = options;
  const actions: string[] = [];

  if (selections.includes("mcp")) {
    const filePath = path.join(repoPath, ".vscode", "mcp.json");
    await ensureDir(path.dirname(filePath));
    const content = renderMcp();
    const result = await safeWriteFile(filePath, content, force);
    actions.push(result);
  }

  if (selections.includes("vscode")) {
    const filePath = path.join(repoPath, ".vscode", "settings.json");
    await ensureDir(path.dirname(filePath));
    const content = renderVscodeSettings(analysis);
    const result = await safeWriteFile(filePath, content, force);
    actions.push(result);
  }

  const summary = actions.length ? `\n${actions.join("\n")}` : "No changes made.";
  return { summary };
}

function renderMcp(): string {
  return JSON.stringify(
    {
      servers: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: "${input:github_token}"
          }
        },
        filesystem: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
        }
      },
      inputs: [
        {
          id: "github_token",
          type: "promptString",
          description: "GitHub Personal Access Token"
        }
      ]
    },
    null,
    2
  );
}

function renderVscodeSettings(analysis: RepoAnalysis): string {
  const reviewFocus = analysis.frameworks.length
    ? `Focus on ${analysis.frameworks.join(", ")} best practices and repo conventions.`
    : "Focus on repo conventions and maintainability.";

  return JSON.stringify(
    {
      "github.copilot.chat.codeGeneration.instructions": [
        { file: ".github/copilot-instructions.md" }
      ],
      "github.copilot.chat.reviewSelection.instructions": [{ text: reviewFocus }],
      "chat.promptFiles": true,
      "chat.mcp.enabled": true
    },
    null,
    2
  );
}
