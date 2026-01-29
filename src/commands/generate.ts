import path from "path";
import { analyzeRepo } from "../services/analyzer";
import { generateConfigs } from "../services/generator";

type GenerateOptions = {
  force?: boolean;
};

export async function generateCommand(type: string, repoPathArg: string | undefined, options: GenerateOptions): Promise<void> {
  const allowed = new Set(["mcp", "vscode", "skills"]);
  if (!allowed.has(type)) {
    console.error("Invalid type. Use: mcp, vscode, skills.");
    process.exitCode = 1;
    return;
  }

  const repoPath = path.resolve(repoPathArg ?? process.cwd());
  const analysis = await analyzeRepo(repoPath);

  const selections = [type];
  const result = await generateConfigs({
    repoPath,
    analysis,
    selections,
    force: Boolean(options.force)
  });

  console.log(result.summary);
}
