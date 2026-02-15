import fs from "fs/promises";
import path from "path";

import { generateCopilotInstructions } from "../services/instructions";
import { ensureDir } from "../utils/fs";

type InstructionsOptions = {
  repo?: string;
  output?: string;
  model?: string;
};

export async function instructionsCommand(options: InstructionsOptions): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  const outputPath = path.resolve(
    options.output ?? path.join(repoPath, ".github", "copilot-instructions.md")
  );

  let content = "";
  try {
    content = await generateCopilotInstructions({
      repoPath,
      model: options.model
    });
  } catch (error) {
    console.error("Failed to generate instructions with Copilot SDK.");
    console.error(
      "Ensure the Copilot CLI is installed (copilot --version) and logged in (run 'copilot' then '/login')."
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }
  if (!content) {
    console.error("No instructions were generated.");
    process.exitCode = 1;
    return;
  }

  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, content, "utf8");

  console.log(`Updated ${path.relative(process.cwd(), outputPath)}`);
  console.log("Please review and share feedback on any unclear or incomplete sections.");
}
