import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { BatchTui } from "../ui/BatchTui";
import { getGitHubToken } from "../services/github";

type BatchOptions = {
  output?: string;
};

export async function batchCommand(options: BatchOptions, cmd: Command): Promise<void> {
  const token = await getGitHubToken();

  if (!token) {
    console.error("Error: GitHub authentication required.");
    console.error("");
    console.error("Option 1 (recommended): Install and authenticate GitHub CLI");
    console.error("  brew install gh && gh auth login");
    console.error("");
    console.error("Option 2: Set a token environment variable");
    console.error("  export GITHUB_TOKEN=<your-token>");
    process.exitCode = 1;
    return;
  }

  const accessible = cmd.parent?.opts().accessible || process.env.INK_SCREEN_READER === "true";
  const { waitUntilExit } = render(
    <BatchTui token={token} outputPath={options.output} accessible={accessible} />,
    { isScreenReaderEnabled: accessible }
  );

  await waitUntilExit();
}
