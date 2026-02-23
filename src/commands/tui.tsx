import path from "path";
import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { PrimerTui } from "../ui/tui";

type TuiOptions = {
  repo?: string;
  animation?: boolean;
};

export async function tuiCommand(options: TuiOptions, cmd: Command): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  const skipAnimation = options.animation === false;
  const accessible = cmd.parent?.opts().accessible || process.env.INK_SCREEN_READER === "true";
  const { waitUntilExit } = render(
    <PrimerTui repoPath={repoPath} skipAnimation={skipAnimation || accessible} accessible={accessible} />,
    { isScreenReaderEnabled: accessible }
  );
  await waitUntilExit();
}
