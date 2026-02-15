import fs from "fs/promises";
import path from "path";

import { generateCopilotInstructions } from "../services/instructions";
import { ensureDir } from "../utils/fs";
import type { CommandResult } from "../utils/output";
import { outputResult, outputError, createProgressReporter, shouldLog } from "../utils/output";

type InstructionsOptions = {
  repo?: string;
  output?: string;
  model?: string;
  json?: boolean;
  quiet?: boolean;
};

export async function instructionsCommand(options: InstructionsOptions): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  const outputPath = path.resolve(
    options.output ?? path.join(repoPath, ".github", "copilot-instructions.md")
  );
  const progress = createProgressReporter(!shouldLog(options));

  try {
    let content = "";
    try {
      progress.update("Generating instructions...");
      content = await generateCopilotInstructions({
        repoPath,
        model: options.model
      });
    } catch (error) {
      const msg =
        "Failed to generate instructions with Copilot SDK. " +
        "Ensure the Copilot CLI is installed (copilot --version) and logged in. " +
        (error instanceof Error ? error.message : String(error));
      outputError(msg, Boolean(options.json));
      return;
    }
    if (!content) {
      outputError("No instructions were generated.", Boolean(options.json));
      return;
    }

    await ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, content, "utf8");

    const byteCount = Buffer.byteLength(content, "utf8");

    if (options.json) {
      const result: CommandResult<{ outputPath: string; model: string; byteCount: number }> = {
        ok: true,
        status: "success",
        data: { outputPath, model: options.model ?? "default", byteCount }
      };
      outputResult(result, true);
    } else if (shouldLog(options)) {
      progress.succeed(`Updated ${path.relative(process.cwd(), outputPath)}`);
      process.stderr.write(
        "Please review and share feedback on any unclear or incomplete sections.\n"
      );
    }
  } catch (error) {
    outputError(
      `Instructions failed: ${error instanceof Error ? error.message : String(error)}`,
      Boolean(options.json)
    );
  }
}
