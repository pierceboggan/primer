import path from "path";

import { outputError } from "@agentrc/core/utils/output";
import { render } from "ink";
import React from "react";

import { AgentRCTui } from "../ui/tui";

type TuiOptions = {
  repo?: string;
  animation?: boolean;
  json?: boolean;
  quiet?: boolean;
  accessible?: boolean;
};

export async function tuiCommand(options: TuiOptions): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  const skipAnimation = options.animation === false;
  try {
    const accessible = options.accessible ? true : undefined;
    const { waitUntilExit } = render(
      <AgentRCTui repoPath={repoPath} skipAnimation={skipAnimation || Boolean(accessible)} />,
      { isScreenReaderEnabled: accessible }
    );
    await waitUntilExit();
  } catch (error) {
    outputError(`TUI failed: ${error instanceof Error ? error.message : String(error)}`, false);
  }
}
