import path from "path";

import { analyzeRepo } from "../services/analyzer";
import type { CommandResult } from "../utils/output";
import { outputResult, outputError, shouldLog } from "../utils/output";
import { prettyPrintSummary } from "../utils/logger";

type AnalyzeOptions = {
  json?: boolean;
  quiet?: boolean;
};

export async function analyzeCommand(
  repoPathArg: string | undefined,
  options: AnalyzeOptions
): Promise<void> {
  const repoPath = path.resolve(repoPathArg ?? process.cwd());

  try {
    const analysis = await analyzeRepo(repoPath);

    if (options.json) {
      const result: CommandResult<typeof analysis> = {
        ok: true,
        status: "success",
        data: analysis
      };
      outputResult(result, true);
    } else if (shouldLog(options)) {
      prettyPrintSummary(analysis);
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error), Boolean(options.json));
  }
}
