import { getGitHubToken } from "@agentrc/core/services/github";
import { parsePolicySources } from "@agentrc/core/services/policy";
import { outputError } from "@agentrc/core/utils/output";
import { render } from "ink";
import React from "react";

import { BatchReadinessTui } from "../ui/BatchReadinessTui";

type BatchReadinessOptions = {
  output?: string;
  policy?: string;
  json?: boolean;
  quiet?: boolean;
  accessible?: boolean;
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
    const policies = parsePolicySources(options.policy);
    const { waitUntilExit } = render(
      <BatchReadinessTui token={token} outputPath={options.output} policies={policies} />,
      { isScreenReaderEnabled: options.accessible ? true : undefined }
    );
    await waitUntilExit();
  } catch (error) {
    outputError(
      `TUI failed: ${error instanceof Error ? error.message : String(error)}`,
      Boolean(options.json)
    );
  }
}
