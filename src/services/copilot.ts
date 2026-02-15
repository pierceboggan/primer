import fs from "fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "path";

import fg from "fast-glob";

const execFileAsync = promisify(execFile);

export type CopilotCliConfig = {
  cliPath: string;
  cliArgs?: string[];
};

let cachedCliConfig: CopilotCliConfig | null = null;
let cachedCliConfigTimestamp = 0;
const CLI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheConfig(config: CopilotCliConfig): CopilotCliConfig {
  cachedCliConfig = config;
  cachedCliConfigTimestamp = Date.now();
  return config;
}

export async function assertCopilotCliReady(): Promise<CopilotCliConfig> {
  const config = await findCopilotCliConfig();

  try {
    const [cmd, args] = buildExecArgs(config, ["--version"]);
    await execFileAsync(cmd, args, { timeout: 5000 });
  } catch {
    const desc = config.cliArgs ? `${config.cliPath} ${config.cliArgs.join(" ")}` : config.cliPath;
    throw new Error(`Copilot CLI at ${desc} is not working.`);
  }

  return config;
}

export async function listCopilotModels(): Promise<string[]> {
  const config = await assertCopilotCliReady();
  const [cmd, args] = buildExecArgs(config, ["--help"]);
  const { stdout } = await execFileAsync(cmd, args, { timeout: 5000 });
  return extractModelChoices(stdout);
}

function buildExecArgs(config: CopilotCliConfig, extraArgs: string[]): [string, string[]] {
  if (config.cliArgs && config.cliArgs.length > 0) {
    return [config.cliPath, [...config.cliArgs, ...extraArgs]];
  }
  if (
    process.platform === "win32" &&
    (config.cliPath.endsWith(".bat") || config.cliPath.endsWith(".cmd"))
  ) {
    return ["cmd", ["/c", config.cliPath, ...extraArgs]];
  }
  return [config.cliPath, extraArgs];
}

async function findCopilotCliConfig(): Promise<CopilotCliConfig> {
  if (cachedCliConfig && Date.now() - cachedCliConfigTimestamp < CLI_CACHE_TTL_MS) {
    return cachedCliConfig;
  }

  const isWindows = process.platform === "win32";
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const appData = process.env.APPDATA ?? "";

  // On Windows, prefer npm-installed binary and use node + cliArgs approach.
  // This bypasses .cmd/.bat wrapper issues that prevent direct spawning.
  // See: https://github.com/microsoft/vscode/issues/291990
  if (isWindows && appData) {
    const npmLoaderPath = path.join(
      appData,
      "npm",
      "node_modules",
      "@github",
      "copilot",
      "npm-loader.js"
    );
    try {
      await fs.access(npmLoaderPath);
      return cacheConfig({ cliPath: process.execPath, cliArgs: [npmLoaderPath] });
    } catch {
      // npm binary not found, will try PATH and VS Code locations
    }
  }

  const whichCmd = isWindows ? "where" : "which";
  try {
    const { stdout } = await execFileAsync(whichCmd, ["copilot"], { timeout: 5000 });
    const found = stdout.trim().split(/\r?\n/)[0];
    if (found) {
      return cacheConfig({ cliPath: found });
    }
  } catch {
    // Not on PATH, will try VS Code locations
  }

  const staticLocations: string[] = [];

  if (process.platform === "darwin") {
    staticLocations.push(
      `${home}/Library/Application Support/Code - Insiders/User/globalStorage/github.copilot-chat/copilotCli/copilot`,
      `${home}/Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot`
    );
  } else if (process.platform === "linux") {
    staticLocations.push(
      `${home}/.config/Code - Insiders/User/globalStorage/github.copilot-chat/copilotCli/copilot`,
      `${home}/.config/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot`
    );
  } else if (isWindows && appData) {
    staticLocations.push(
      `${appData}\\Code - Insiders\\User\\globalStorage\\github.copilot-chat\\copilotCli\\copilot.bat`,
      `${appData}\\Code\\User\\globalStorage\\github.copilot-chat\\copilotCli\\copilot.bat`
    );
  }

  for (const location of staticLocations) {
    try {
      await fs.access(location);
      return cacheConfig({ cliPath: location });
    } catch {
      // Try next
    }
  }

  const exts = isWindows ? "{.exe,.bat,.cmd}" : "";
  const normalizedHome = home.replace(/\\/g, "/");
  const globPatterns = [
    `${normalizedHome}/.vscode-insiders/extensions/github.copilot-chat-*/copilotCli/copilot${exts}`,
    `${normalizedHome}/.vscode/extensions/github.copilot-chat-*/copilotCli/copilot${exts}`
  ];

  for (const pattern of globPatterns) {
    const matches = await fg(pattern, { onlyFiles: true });
    if (matches.length > 0) {
      return cacheConfig({ cliPath: path.normalize(matches[0]) });
    }
  }

  const platformHint = isWindows
    ? " Searched APPDATA and VS Code extension paths."
    : process.platform === "linux"
      ? " Searched ~/.config/Code and VS Code extension paths."
      : " Searched ~/Library/Application Support/Code and VS Code extension paths.";

  throw new Error(
    `Copilot CLI not found. Install GitHub Copilot Chat extension in VS Code or run: npm install -g @github/copilot.${platformHint}`
  );
}

function extractModelChoices(helpText: string): string[] {
  const lines = helpText.split("\n");
  let captured = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.includes("--model")) continue;

    captured = line.trim();
    while (!captured.includes(")") && index + 1 < lines.length) {
      index += 1;
      captured += ` ${lines[index].trim()}`;
    }
    break;
  }

  const match = captured.match(/choices:\s*([^)]*)/);
  if (!match) return [];

  const models: string[] = [];
  const matcher = /"([^"]+)"/g;
  let entry = matcher.exec(match[1]);
  while (entry) {
    models.push(entry[1]);
    entry = matcher.exec(match[1]);
  }

  return models;
}
