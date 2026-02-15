import chalk from "chalk";

import type { RepoAnalysis } from "../services/analyzer";

export function prettyPrintSummary(analysis: RepoAnalysis): void {
  const log = (msg: string) => process.stderr.write(msg + "\n");
  log(chalk.bold("Repository analysis"));
  log(`- Path: ${analysis.path}`);
  log(`- Git: ${analysis.isGitRepo ? "yes" : "no"}`);
  log(`- Languages: ${analysis.languages.join(", ") || "unknown"}`);
  log(`- Frameworks: ${analysis.frameworks.join(", ") || "none"}`);
  log(`- Package manager: ${analysis.packageManager ?? "unknown"}`);
}
