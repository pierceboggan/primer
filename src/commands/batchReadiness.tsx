import { render } from "ink";
import React from "react";

import { getGitHubToken } from "../services/github";
import { outputError } from "../utils/output";
import { BatchReadinessTui } from "../ui/BatchReadinessTui";

type BatchReadinessOptions = {
  output?: string;
  json?: boolean;
  quiet?: boolean;
};

export async function batchReadinessCommand(options: BatchReadinessOptions): Promise<void> {
  const token = await getGitHubToken();
  if (!token) {
    outputError(
      "GitHub authentication required. Install and authenticate GitHub CLI (gh auth login) or set GITHUB_TOKEN.",
      Boolean(options.json)
    );
    return;
  }

  try {
    const { waitUntilExit } = render(
      <BatchReadinessTui token={token} outputPath={options.output} />
    );
    await waitUntilExit();
  } catch (error) {
    outputError(
      `TUI failed: ${error instanceof Error ? error.message : String(error)}`,
      Boolean(options.json)
    );
  }
}
