import chalk from "chalk";

import type { RepoAnalysis } from "../services/analyzer";

export function prettyPrintSummary(analysis: RepoAnalysis): void {
  console.log(chalk.bold("Repository analysis"));
  console.log(`- Path: ${analysis.path}`);
  console.log(`- Git: ${analysis.isGitRepo ? "yes" : "no"}`);
  console.log(`- Languages: ${analysis.languages.join(", ") || "unknown"}`);
  console.log(`- Frameworks: ${analysis.frameworks.join(", ") || "none"}`);
  console.log(`- Package manager: ${analysis.packageManager ?? "unknown"}`);
}
