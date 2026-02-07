import fs from "fs/promises";
import path from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type EvalCase = {
  prompt: string;
  expectation: string;
  id?: string;
};

type EvalConfig = {
  instructionFile?: string;
  cases: EvalCase[];
  systemMessage?: string;
  outputPath?: string;
};

const DEFAULT_SYSTEM_MESSAGE =
  "You are answering questions about this repository. Use tools to inspect the repo and cite its files. Avoid generic Copilot CLI details unless the prompt explicitly asks for them.";

type EvalRunOptions = {
  configPath: string;
  repoPath: string;
  model: string;
  judgeModel: string;
  outputPath?: string;
  onProgress?: (message: string) => void;
};

type TokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

type ToolCallSummary = {
  count: number;
  byName: Record<string, number>;
  totalDurationMs: number;
};

type AskMetrics = {
  durationMs: number;
  tokenUsage?: TokenUsage;
  toolCalls: ToolCallSummary;
};

type EvalMetrics = {
  withoutInstructions: AskMetrics;
  withInstructions: AskMetrics;
  judge: AskMetrics;
  totalDurationMs: number;
};

type EvalPhase = "withoutInstructions" | "withInstructions" | "judge";

type TrajectoryEvent = {
  timestampMs: number;
  phase: EvalPhase;
  type: string;
  data?: Record<string, unknown>;
};

export type EvalResult = {
  id: string;
  prompt: string;
  expectation: string;
  withInstructions?: string;
  withoutInstructions?: string;
  verdict?: "pass" | "fail" | "unknown";
  score?: number;
  rationale?: string;
  metrics?: EvalMetrics;
  trajectory?: TrajectoryEvent[];
};

export async function runEval(options: EvalRunOptions): Promise<{ summary: string; results: EvalResult[]; viewerPath?: string }> {
  const config = await loadConfig(options.configPath);
  const instructionFile = config.instructionFile ?? ".github/copilot-instructions.md";
  const instructionPath = path.resolve(options.repoPath, instructionFile);
  const instructionText = await readOptionalFile(instructionPath);
  const baseSystemMessage = config.systemMessage ?? DEFAULT_SYSTEM_MESSAGE;
  const progress = options.onProgress ?? (() => {});
  const defaultOutputPath = path.resolve(
    options.repoPath,
    ".primer",
    "evals",
    buildTimestampedName("eval-results")
  );
  const outputPath = resolveOutputPath(options.repoPath, options.outputPath, config.outputPath) ?? defaultOutputPath;
  const runStartedAt = Date.now();

  progress("Starting Copilot SDK...");
  const cliPath = await findCopilotCliPath();
  const sdk = await import("@github/copilot-sdk");
  const client = new sdk.CopilotClient({ cliPath });

  try {
    const results: EvalResult[] = [];
    const total = config.cases.length;

    for (const [index, testCase] of config.cases.entries()) {
      const id = testCase.id ?? `case-${index + 1}`;
      const prompt = buildPrompt(options.repoPath, testCase.prompt);
      const caseStartedAt = Date.now();

      progress(`Running eval ${index + 1}/${total}: ${id} (without instructions)...`);
      const withoutResult = await askOnce(client, {
        prompt,
        model: options.model,
        systemMessage: baseSystemMessage,
        phase: "withoutInstructions"
      });

      progress(`Running eval ${index + 1}/${total}: ${id} (with instructions)...`);
      const withResult = await askOnce(client, {
        prompt,
        model: options.model,
        systemMessage: [baseSystemMessage, instructionText].filter(Boolean).join("\n\n"),
        phase: "withInstructions"
      });

      progress(`Running eval ${index + 1}/${total}: ${id} (judging)...`);
      const judgment = await judge(client, {
        model: options.judgeModel,
        prompt: testCase.prompt,
        expectation: testCase.expectation,
        withoutInstructions: withoutResult.content,
        withInstructions: withResult.content
      });

      const metrics: EvalMetrics = {
        withoutInstructions: withoutResult.metrics,
        withInstructions: withResult.metrics,
        judge: judgment.metrics,
        totalDurationMs: Date.now() - caseStartedAt
      };

      const trajectory = [
        ...withoutResult.trajectory,
        ...withResult.trajectory,
        ...judgment.trajectory
      ];

      results.push({
        id,
        prompt: testCase.prompt,
        expectation: testCase.expectation,
        withInstructions: withResult.content,
        withoutInstructions: withoutResult.content,
        verdict: judgment.result.verdict,
        score: judgment.result.score,
        rationale: judgment.result.rationale,
        metrics,
        trajectory
      });

      progress(`Eval ${index + 1}/${total}: ${id} → ${judgment.result.verdict} (score: ${judgment.result.score})`);
    }

    const runFinishedAt = Date.now();
    const output = {
      repoPath: options.repoPath,
      model: options.model,
      judgeModel: options.judgeModel,
      runMetrics: {
        startedAt: new Date(runStartedAt).toISOString(),
        finishedAt: new Date(runFinishedAt).toISOString(),
        durationMs: runFinishedAt - runStartedAt
      },
      results
    };
    let viewerPath: string | undefined;
    if (outputPath) {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
      viewerPath = buildViewerPath(outputPath);
      await fs.writeFile(viewerPath, buildTrajectoryViewerHtml(output), "utf8");
    }

    const summary = formatSummary(results, runFinishedAt - runStartedAt);
    return { summary, results, viewerPath };
  } finally {
    await client.stop();
  }
}

type AskOptions = {
  prompt: string;
  model: string;
  systemMessage?: string;
  phase: EvalPhase;
};

type AskResult = {
  content: string;
  metrics: AskMetrics;
  trajectory: TrajectoryEvent[];
};

async function askOnce(
  client: { createSession: (config?: Record<string, unknown>) => Promise<any> },
  options: AskOptions
): Promise<AskResult> {
  const session = await client.createSession({
    model: options.model,
    streaming: true,
    infiniteSessions: { enabled: false },
    systemMessage: options.systemMessage
      ? { content: options.systemMessage }
      : undefined
  });

  let content = "";
  const telemetry = createTelemetry(options.phase);
  const startedAt = Date.now();
  session.on((event: { type: string; data?: Record<string, unknown> }) => {
    captureTelemetryEvent(event, telemetry);
    if (event.type === "assistant.message_delta") {
      const delta = event.data?.deltaContent as string | undefined;
      if (delta) content += delta;
    }
  });

  await session.sendAndWait({ prompt: options.prompt }, 120000);
  await session.destroy();
  const finishedAt = Date.now();
  return {
    content: content.trim(),
    metrics: {
      durationMs: finishedAt - startedAt,
      tokenUsage: normalizeTokenUsage(telemetry.tokenUsage),
      toolCalls: telemetry.toolCalls
    },
    trajectory: telemetry.trajectory
  };
}

type JudgeOptions = {
  model: string;
  prompt: string;
  expectation: string;
  withoutInstructions: string;
  withInstructions: string;
};

type JudgeResult = {
  verdict: "pass" | "fail" | "unknown";
  score: number;
  rationale: string;
};

async function judge(
  client: { createSession: (config?: Record<string, unknown>) => Promise<any> },
  options: JudgeOptions
): Promise<{ result: JudgeResult; metrics: AskMetrics; trajectory: TrajectoryEvent[] }> {
  const session = await client.createSession({
    model: options.model,
    streaming: true,
    infiniteSessions: { enabled: false },
    systemMessage: {
      content: "You are a strict evaluator. Return JSON with keys: verdict (pass|fail|unknown), score (0-100), rationale. Do not include any other text."
    }
  });

  let content = "";
  const telemetry = createTelemetry("judge");
  const startedAt = Date.now();
  session.on((event: { type: string; data?: Record<string, unknown> }) => {
    captureTelemetryEvent(event, telemetry);
    if (event.type === "assistant.message_delta") {
      const delta = event.data?.deltaContent as string | undefined;
      if (delta) content += delta;
    }
  });

  const prompt = [
    "Evaluate which response best matches the expectation.",
    "",
    `Expectation: ${options.expectation}`,
    "",
    "Response A (without custom instructions):",
    options.withoutInstructions,
    "",
    "Response B (with custom instructions):",
    options.withInstructions,
    "",
    "Return JSON only."
  ].join("\n");

  await session.sendAndWait({ prompt }, 120000);
  await session.destroy();

  const finishedAt = Date.now();
  return {
    result: parseJudge(content),
    metrics: {
      durationMs: finishedAt - startedAt,
      tokenUsage: normalizeTokenUsage(telemetry.tokenUsage),
      toolCalls: telemetry.toolCalls
    },
    trajectory: telemetry.trajectory
  };
}

function parseJudge(content: string): JudgeResult {
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON detected");
    const parsed = JSON.parse(match[0]) as JudgeResult;
    if (!parsed.verdict) throw new Error("Missing verdict");
    return {
      verdict: parsed.verdict,
      score: Number(parsed.score ?? 0),
      rationale: String(parsed.rationale ?? "")
    };
  } catch {
    return {
      verdict: "unknown",
      score: 0,
      rationale: content.trim()
    };
  }
}

async function loadConfig(configPath: string): Promise<EvalConfig> {
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw) as EvalConfig;
}

async function findCopilotCliPath(): Promise<string> {
  // Try standard PATH first
  try {
    const { stdout } = await execFileAsync("which", ["copilot"], { timeout: 5000 });
    return stdout.trim();
  } catch {
    // Ignore - will try VS Code location
  }

  // VS Code Copilot Chat extension location
  const home = process.env.HOME ?? "";
  const vscodeLocations = [
    `${home}/Library/Application Support/Code - Insiders/User/globalStorage/github.copilot-chat/copilotCli/copilot`,
    `${home}/Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot`,
    `${home}/.vscode-insiders/extensions/github.copilot-chat-*/copilotCli/copilot`,
    `${home}/.vscode/extensions/github.copilot-chat-*/copilotCli/copilot`,
  ];

  for (const location of vscodeLocations) {
    try {
      await fs.access(location);
      return location;
    } catch {
      // Try next location
    }
  }

  throw new Error("Copilot CLI not found. Install GitHub Copilot Chat extension in VS Code.");
}

async function readOptionalFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function buildPrompt(repoPath: string, userPrompt: string): string {
  return [
    "You are working in this repository:",
    repoPath,
    "Use the file system tools when needed to inspect the codebase.",
    "",
    userPrompt
  ].join("\n");
}

function formatSummary(results: EvalResult[], runDurationMs: number): string {
  const total = results.length;
  const passed = results.filter((r) => r.verdict === "pass").length;
  const failed = results.filter((r) => r.verdict === "fail").length;
  const unknown = results.filter((r) => r.verdict === "unknown").length;
  const totalUsage = aggregateTokenUsage(results);
  const hasUsage = Boolean(totalUsage.promptTokens || totalUsage.completionTokens || totalUsage.totalTokens);

  const lines = [
    `Eval results: ${passed}/${total} pass, ${failed} fail, ${unknown} unknown.`,
    `Runtime: ${formatDuration(runDurationMs)}.`,
    hasUsage ? `Token usage: ${formatTokenUsage(totalUsage)}.` : "Token usage: unavailable."
  ];

  for (const result of results) {
    lines.push(
      `- ${result.id}: ${result.verdict ?? "unknown"} (score: ${result.score ?? 0})`
    );
  }

  return `\n${lines.join("\n")}`;
}

type TelemetryCollector = {
  trajectory: TrajectoryEvent[];
  tokenUsage: TokenUsage;
  toolCalls: ToolCallSummary;
  toolCallMap: Map<string, { name?: string; startMs: number }>;
  phase: EvalPhase;
};

function createTelemetry(phase: EvalPhase): TelemetryCollector {
  return {
    trajectory: [],
    tokenUsage: {},
    toolCalls: { count: 0, byName: {}, totalDurationMs: 0 },
    toolCallMap: new Map(),
    phase
  };
}

function captureTelemetryEvent(
  event: { type: string; data?: Record<string, unknown> },
  telemetry: TelemetryCollector
): void {
  const timestampMs = Date.now();
  telemetry.trajectory.push({
    timestampMs,
    phase: telemetry.phase,
    type: event.type,
    data: sanitizeEventData(event.data)
  });

  if (event.type === "tool.execution_start") {
    const toolName = (event.data?.toolName as string | undefined) ?? "unknown";
    const toolId = resolveToolId(event.data, toolName, telemetry.toolCallMap.size);
    telemetry.toolCallMap.set(toolId, { name: toolName, startMs: timestampMs });
    telemetry.toolCalls.count += 1;
    telemetry.toolCalls.byName[toolName] = (telemetry.toolCalls.byName[toolName] ?? 0) + 1;
  } else if (event.type === "tool.execution_finish" || event.type === "tool.execution_error") {
    const toolName = (event.data?.toolName as string | undefined) ?? "unknown";
    const toolId = resolveToolId(event.data, toolName, telemetry.toolCallMap.size);
    const entry = telemetry.toolCallMap.get(toolId) ?? findLatestToolByName(telemetry.toolCallMap, toolName);
    if (entry) {
      const durationMs = timestampMs - entry.startMs;
      telemetry.toolCalls.totalDurationMs += durationMs;
      telemetry.toolCallMap.delete(toolId);
    }
  }

  const usage = extractTokenUsage(event.data);
  if (usage) {
    telemetry.tokenUsage = mergeTokenUsage(telemetry.tokenUsage, usage);
  }
}

function resolveToolId(
  data: Record<string, unknown> | undefined,
  toolName: string,
  index: number
): string {
  const rawId = data?.executionId ?? data?.toolCallId ?? data?.callId ?? data?.id;
  if (typeof rawId === "string" || typeof rawId === "number") {
    return String(rawId);
  }
  return `${toolName}-${index + 1}`;
}

function findLatestToolByName(
  map: Map<string, { name?: string; startMs: number }>,
  toolName: string
): { name?: string; startMs: number } | undefined {
  const entries = Array.from(map.values()).filter((entry) => entry.name === toolName);
  return entries.at(-1);
}

function extractTokenUsage(data: Record<string, unknown> | undefined): TokenUsage | null {
  if (!data) return null;
  const usage = findUsageObject(data);
  const promptTokens = getNumber(
    usage?.prompt_tokens ?? usage?.promptTokens ?? data.promptTokens ?? data.inputTokens
  );
  const completionTokens = getNumber(
    usage?.completion_tokens ?? usage?.completionTokens ?? data.completionTokens ?? data.outputTokens
  );
  const totalTokens = getNumber(usage?.total_tokens ?? usage?.totalTokens ?? data.totalTokens);

  if (promptTokens == null && completionTokens == null && totalTokens == null) {
    return null;
  }

  return {
    promptTokens: promptTokens ?? undefined,
    completionTokens: completionTokens ?? undefined,
    totalTokens: totalTokens ?? undefined
  };
}

function findUsageObject(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const direct = (data.usage ?? data.tokenUsage ?? data.tokens) as Record<string, unknown> | undefined;
  if (direct) return direct;

  const candidates = [
    data.response,
    data.result,
    data.message,
    data.metrics,
    data.output
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const nested = (candidate as Record<string, unknown>).usage ?? (candidate as Record<string, unknown>).tokenUsage;
      if (nested && typeof nested === "object") return nested as Record<string, unknown>;
    }
  }

  return scanForUsage(data, 0);
}

function scanForUsage(value: unknown, depth: number): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || depth > 4) return undefined;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = scanForUsage(entry, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (hasTokenFields(record)) return record;

  for (const entry of Object.values(record)) {
    const found = scanForUsage(entry, depth + 1);
    if (found) return found;
  }

  return undefined;
}

function hasTokenFields(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record);
  return (
    keys.includes("prompt_tokens") ||
    keys.includes("completion_tokens") ||
    keys.includes("total_tokens") ||
    keys.includes("promptTokens") ||
    keys.includes("completionTokens") ||
    keys.includes("totalTokens") ||
    keys.includes("inputTokens") ||
    keys.includes("outputTokens")
  );
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mergeTokenUsage(existing: TokenUsage, next: TokenUsage): TokenUsage {
  return {
    promptTokens: Math.max(existing.promptTokens ?? 0, next.promptTokens ?? 0) || undefined,
    completionTokens: Math.max(existing.completionTokens ?? 0, next.completionTokens ?? 0) || undefined,
    totalTokens: Math.max(existing.totalTokens ?? 0, next.totalTokens ?? 0) || undefined
  };
}

function normalizeTokenUsage(usage: TokenUsage): TokenUsage | undefined {
  if (!usage.promptTokens && !usage.completionTokens && !usage.totalTokens) return undefined;
  if (!usage.totalTokens) {
    const prompt = usage.promptTokens ?? 0;
    const completion = usage.completionTokens ?? 0;
    const total = prompt + completion;
    return {
      ...usage,
      totalTokens: total || undefined
    };
  }
  return usage;
}

function aggregateTokenUsage(results: EvalResult[]): TokenUsage {
  const total: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  for (const result of results) {
    const metrics = result.metrics;
    if (!metrics) continue;
    const usages = [metrics.withoutInstructions.tokenUsage, metrics.withInstructions.tokenUsage, metrics.judge.tokenUsage];
    for (const usage of usages) {
      if (!usage) continue;
      total.promptTokens = (total.promptTokens ?? 0) + (usage.promptTokens ?? 0);
      total.completionTokens = (total.completionTokens ?? 0) + (usage.completionTokens ?? 0);
      total.totalTokens = (total.totalTokens ?? 0) + (usage.totalTokens ?? 0);
    }
  }
  return total;
}

function formatDuration(durationMs: number): string {
  const seconds = Math.round(durationMs / 100) / 10;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round((seconds % 60) * 10) / 10;
  return `${minutes}m ${remaining}s`;
}

function formatTokenUsage(usage: TokenUsage): string {
  const prompt = usage.promptTokens ?? 0;
  const completion = usage.completionTokens ?? 0;
  const total = usage.totalTokens ?? prompt + completion;
  return `prompt ${prompt}, completion ${completion}, total ${total}`;
}

function resolveOutputPath(repoPath: string, override?: string, configValue?: string): string | undefined {
  const chosen = override ?? configValue;
  if (!chosen) return undefined;
  return path.isAbsolute(chosen) ? chosen : path.resolve(repoPath, chosen);
}

function buildTimestampedName(baseName: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  return `${baseName}-${stamp}.json`;
}

function buildViewerPath(outputPath: string): string {
  if (outputPath.endsWith(".json")) {
    return outputPath.replace(/\.json$/u, ".html");
  }
  return `${outputPath}.html`;
}

function buildTrajectoryViewerHtml(data: Record<string, unknown>): string {
  const serialized = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Primer Eval Trajectory</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
        color: #e8eaf0;
        line-height: 1.6;
        min-height: 100vh;
      }
      .header {
        background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
        border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        padding: 24px 32px;
        position: sticky;
        top: 0;
        z-index: 100;
        backdrop-filter: blur(10px);
      }
      h1 {
        font-size: 28px;
        margin: 0 0 12px 0;
        font-weight: 700;
        background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .summary {
        color: #a0aec0;
        font-size: 14px;
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
      }
      .summary-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .summary-label {
        color: #6b7280;
        font-weight: 500;
      }
      .container {
        padding: 32px;
        max-width: 1800px;
        margin: 0 auto;
      }
      .tool-summary-panel {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid rgba(71, 85, 105, 0.3);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        backdrop-filter: blur(10px);
      }
      .layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 24px;
        align-items: start;
      }
      @media (max-width: 1200px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
      .panel {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid rgba(71, 85, 105, 0.3);
        border-radius: 16px;
        padding: 24px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }
      .panel:hover {
        border-color: rgba(99, 102, 241, 0.4);
        box-shadow: 0 8px 32px rgba(99, 102, 241, 0.1);
      }
      .section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid rgba(71, 85, 105, 0.3);
      }
      .section:first-child {
        margin-top: 0;
        padding-top: 0;
        border-top: none;
      }
      .section h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        color: #e8eaf0;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .section-toggle {
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .section-toggle::after {
        content: '▼';
        font-size: 10px;
        color: #6b7280;
        transition: transform 0.2s ease;
      }
      .section-toggle.collapsed::after {
        transform: rotate(-90deg);
      }
      .section-content {
        max-height: 2000px;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      .section-content.collapsed {
        max-height: 0;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .chip {
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 13px;
        color: #c7d2fe;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      .chip:hover {
        background: rgba(99, 102, 241, 0.2);
        border-color: rgba(99, 102, 241, 0.5);
      }
      .chip.phase {
        background: rgba(168, 85, 247, 0.1);
        border-color: rgba(168, 85, 247, 0.3);
        color: #e9d5ff;
      }
      .muted {
        color: #9ca3af;
        font-size: 13px;
      }
      .filters {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 16px;
        padding: 16px;
        background: rgba(15, 23, 42, 0.5);
        border-radius: 12px;
        border: 1px solid rgba(71, 85, 105, 0.3);
      }
      .filters label {
        font-size: 13px;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-weight: 500;
      }
      .filters input[type="checkbox"] {
        cursor: pointer;
        width: 16px;
        height: 16px;
      }
      .filters select {
        background: rgba(30, 41, 59, 0.8);
        color: #e8eaf0;
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
      }
      .filters select:hover {
        border-color: rgba(99, 102, 241, 0.5);
      }
      .filters select:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      .case-list {
        position: sticky;
        top: 120px;
        max-height: calc(100vh - 180px);
        overflow-y: auto;
      }
      .case {
        padding: 12px 16px;
        border-radius: 12px;
        cursor: pointer;
        margin-bottom: 8px;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        background: rgba(15, 23, 42, 0.3);
      }
      .case:hover {
        background: rgba(30, 41, 59, 0.6);
        border-color: rgba(99, 102, 241, 0.3);
      }
      .case.active {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
        border-color: rgba(99, 102, 241, 0.6);
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
      }
      .case-title {
        font-weight: 600;
        color: #e8eaf0;
        margin-bottom: 4px;
        font-size: 14px;
      }
      .case span {
        display: block;
        font-size: 12px;
        color: #9ca3af;
      }
      .verdict-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .verdict-pass {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }
      .verdict-fail {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .verdict-unknown {
        background: rgba(251, 191, 36, 0.2);
        color: #fde68a;
        border: 1px solid rgba(251, 191, 36, 0.3);
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: rgba(15, 23, 42, 0.8);
        padding: 16px;
        border-radius: 12px;
        border: 1px solid rgba(71, 85, 105, 0.3);
        font-size: 13px;
        line-height: 1.5;
        color: #cbd5e1;
        max-height: 400px;
        overflow: auto;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      }
      pre::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      pre::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
        border-radius: 4px;
      }
      pre::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.3);
        border-radius: 4px;
      }
      pre::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.5);
      }
      .pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 8px;
        background: rgba(99, 102, 241, 0.15);
        margin-right: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #c7d2fe;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }
      .trajectory {
        max-height: 600px;
        overflow-y: auto;
        padding-right: 8px;
      }
      .trajectory::-webkit-scrollbar {
        width: 10px;
      }
      .trajectory::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
        border-radius: 5px;
      }
      .trajectory::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.3);
        border-radius: 5px;
      }
      .trajectory::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.5);
      }
      .event {
        border-bottom: 1px solid rgba(71, 85, 105, 0.2);
        padding: 16px 0;
        transition: background 0.2s ease;
      }
      .event:hover {
        background: rgba(99, 102, 241, 0.05);
        margin: 0 -8px;
        padding: 16px 8px;
        border-radius: 8px;
      }
      .event:last-child {
        border-bottom: none;
      }
      .event-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .event-type {
        font-weight: 600;
        color: #e8eaf0;
        font-size: 14px;
      }
      .event-time {
        color: #6b7280;
        font-size: 12px;
        font-family: 'SF Mono', Monaco, monospace;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .metric-card {
        background: rgba(15, 23, 42, 0.5);
        padding: 12px;
        border-radius: 10px;
        border: 1px solid rgba(71, 85, 105, 0.3);
      }
      .metric-value {
        font-size: 20px;
        font-weight: 700;
        color: #e8eaf0;
        margin-bottom: 4px;
      }
      .metric-label {
        font-size: 12px;
        color: #9ca3af;
        font-weight: 500;
      }
      .info-box {
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 12px;
        padding: 16px;
        margin: 12px 0;
      }
      .info-box p {
        margin: 8px 0;
        color: #cbd5e1;
        font-size: 14px;
      }
      .info-box strong {
        color: #e8eaf0;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Primer Eval Trajectory</h1>
      <div class="summary" id="summary"></div>
    </div>
    <div class="container">
      <div class="tool-summary-panel" id="toolSummary"></div>
      <div class="layout">
        <div class="panel case-list" id="caseList"></div>
        <div class="panel" id="caseDetails"></div>
      </div>
    </div>
    <script>
      const data = ${serialized};
      const summaryEl = document.getElementById('summary');
      const toolSummaryEl = document.getElementById('toolSummary');
      const caseListEl = document.getElementById('caseList');
      const caseDetailsEl = document.getElementById('caseDetails');

      const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const results = data.results || [];
      let activeCaseId = null;
      let toolsOnly = false;
      let phaseFilter = 'all';

      const formatRepoName = (path) => {
        if (!path) return 'unknown';
        const parts = path.split('/');
        return parts[parts.length - 1] || path;
      };

      summaryEl.innerHTML =
        '<div class="summary-item"><span class="summary-label">Repo:</span> ' +
        formatRepoName(data.repoPath) +
        '</div>' +
        '<div class="summary-item"><span class="summary-label">Model:</span> ' +
        (data.model || 'unknown') +
        '</div>' +
        '<div class="summary-item"><span class="summary-label">Judge:</span> ' +
        (data.judgeModel || 'unknown') +
        '</div>' +
        '<div class="summary-item"><span class="summary-label">Cases:</span> ' +
        results.length +
        '</div>';

      function collectToolCounts(events, phase) {
        const counts = { total: 0, byName: {} };
        if (!events) return counts;
        events.forEach((event) => {
          if (phase && event.phase !== phase) return;
          if (event.type !== 'tool.execution_start') return;
          const name = (event.data && event.data.toolName) || 'unknown';
          counts.total += 1;
          counts.byName[name] = (counts.byName[name] || 0) + 1;
        });
        return counts;
      }

      function mergeToolCounts(target, source) {
        target.total += source.total;
        Object.entries(source.byName).forEach(([name, count]) => {
          target.byName[name] = (target.byName[name] || 0) + count;
        });
      }

      function renderToolChips(counts, limit) {
        const entries = Object.entries(counts.byName)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit);
        if (!entries.length) return '<span class="muted">No tool calls recorded.</span>';
        return '<div class="chips">' +
          entries.map(([name, count]) => '<span class="chip">' + name + ': ' + count + '</span>').join('') +
          '</div>';
      }

      function renderOverallToolSummary() {
        const overall = { total: 0, byName: {} };
        results.forEach((result) => mergeToolCounts(overall, collectToolCounts(result.trajectory || [])));

        const passed = results.filter(r => r.verdict === 'pass').length;
        const failed = results.filter(r => r.verdict === 'fail').length;
        const unknown = results.filter(r => r.verdict === 'unknown').length;

        toolSummaryEl.innerHTML =
          '<div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 24px;">' +
          '<div style="flex: 1;">' +
          '<h3 style="margin: 0 0 12px 0; font-size: 18px; color: #e8eaf0;">Overall Summary</h3>' +
          '<div class="metrics-grid" style="margin-top: 16px;">' +
          '<div class="metric-card">' +
          '<div class="metric-value verdict-pass">' + passed + '</div>' +
          '<div class="metric-label">Passed</div>' +
          '</div>' +
          '<div class="metric-card">' +
          '<div class="metric-value verdict-fail">' + failed + '</div>' +
          '<div class="metric-label">Failed</div>' +
          '</div>' +
          '<div class="metric-card">' +
          '<div class="metric-value verdict-unknown">' + unknown + '</div>' +
          '<div class="metric-label">Unknown</div>' +
          '</div>' +
          '<div class="metric-card">' +
          '<div class="metric-value">' + overall.total + '</div>' +
          '<div class="metric-label">Total Tool Calls</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div style="flex: 1;">' +
          '<h3 style="margin: 0 0 12px 0; font-size: 18px; color: #e8eaf0;">Top Tools Used</h3>' +
          renderToolChips(overall, 10) +
          '</div>' +
          '</div>';
      }

      function renderCaseList(activeId) {
        caseListEl.innerHTML = '<h3 style="margin: 0 0 16px 0; font-size: 16px;">Test Cases</h3>';
        results.forEach((result) => {
          const row = document.createElement('div');
          row.className = 'case ' + (result.id === activeId ? 'active' : '');

          const verdictClass = result.verdict === 'pass' ? 'verdict-pass' :
                              result.verdict === 'fail' ? 'verdict-fail' : 'verdict-unknown';

          row.innerHTML =
            '<div class="case-title">' + escapeHtml(result.id) + '</div>' +
            '<span class="verdict-badge ' + verdictClass + '">' + (result.verdict ?? 'unknown') + '</span> ' +
            '<span>Score: ' + (result.score ?? 0) + '</span>';

          row.addEventListener('click', () => renderCaseDetails(result.id));
          caseListEl.appendChild(row);
        });
      }

      function renderMetrics(metrics) {
        if (!metrics) return '<p class="muted">No metrics available.</p>';
        const fmt = (m, label) => {
          const usage = m.tokenUsage;
          const prompt = usage?.promptTokens ?? 0;
          const completion = usage?.completionTokens ?? 0;
          const total = usage?.totalTokens ?? (usage ? (prompt + completion) : 0);
          return (
            '<div class="metric-card">' +
            '<div class="pill">' + label + '</div>' +
            '<div style="margin-top: 8px;">' +
            '<div class="muted">Duration: ' + m.durationMs + 'ms</div>' +
            '<div class="muted">Tokens: ' + prompt + ' / ' + completion + ' / ' + total + '</div>' +
            '<div class="muted">Tool calls: ' + (m.toolCalls?.count ?? 0) + '</div>' +
            '</div>' +
            '</div>'
          );
        };
        return (
          '<div class="metrics-grid">' +
          fmt(metrics.withoutInstructions, 'Without Instructions') +
          fmt(metrics.withInstructions, 'With Instructions') +
          fmt(metrics.judge, 'Judge') +
          '<div class="metric-card">' +
          '<div class="pill">Total</div>' +
          '<div style="margin-top: 8px;">' +
          '<div class="metric-value">' + metrics.totalDurationMs + '<span style="font-size: 14px; font-weight: 400; color: #9ca3af;">ms</span></div>' +
          '<div class="metric-label">Total Duration</div>' +
          '</div>' +
          '</div>' +
          '</div>'
        );
      }

      function renderTrajectory(events) {
        if (!events || !events.length) return '<p class="muted">No trajectory events captured.</p>';
        const filtered = events.filter((event) => {
          if (phaseFilter !== 'all' && event.phase !== phaseFilter) return false;
          if (toolsOnly && !event.type.startsWith('tool.')) return false;
          return true;
        });
        if (!filtered.length) return '<p class="muted">No events match the current filters.</p>';
        return (
          '<div class="trajectory">' +
          filtered
            .map(
              (event) =>
                '<div class="event">' +
                '<div class="event-header">' +
                '<div class="event-type">' +
                event.type +
                '</div>' +
                '<span class="pill phase">' +
                event.phase +
                '</span>' +
                '<span class="event-time">' +
                new Date(event.timestampMs).toISOString() +
                '</span>' +
                '</div>' +
                '<pre>' +
                JSON.stringify(event.data ?? {}, null, 2) +
                '</pre>' +
                '</div>'
            )
            .join('') +
          '</div>'
        );
      }

      function renderCaseDetails(caseId) {
        const result = results.find((r) => r.id === caseId) ?? results[0];
        if (!result) {
          caseDetailsEl.innerHTML = '<p class="muted">No results available.</p>';
          return;
        }
        activeCaseId = result.id;
        renderCaseList(result.id);
        const toolCounts = collectToolCounts(result.trajectory || []);
        const toolCountsWithout = collectToolCounts(result.trajectory || [], 'withoutInstructions');
        const toolCountsWith = collectToolCounts(result.trajectory || [], 'withInstructions');
        const toolCountsJudge = collectToolCounts(result.trajectory || [], 'judge');

        const verdictClass = result.verdict === 'pass' ? 'verdict-pass' :
                            result.verdict === 'fail' ? 'verdict-fail' : 'verdict-unknown';

        caseDetailsEl.innerHTML =
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">' +
          '<h2 style="margin: 0; font-size: 24px; color: #e8eaf0;">' +
          escapeHtml(result.id) +
          '</h2>' +
          '<span class="verdict-badge ' + verdictClass + '" style="padding: 6px 16px; font-size: 13px;">' +
          (result.verdict ?? 'unknown') + ' • Score: ' + (result.score ?? 0) +
          '</span>' +
          '</div>' +
          '<div class="filters">' +
          '<label><input type="checkbox" id="toolsOnly" ' + (toolsOnly ? 'checked' : '') + ' /> Tools only</label>' +
          '<label>Phase: ' +
          '<select id="phaseFilter">' +
          '<option value="all" ' + (phaseFilter === 'all' ? 'selected' : '') + '>All</option>' +
          '<option value="withoutInstructions" ' + (phaseFilter === 'withoutInstructions' ? 'selected' : '') + '>Without instructions</option>' +
          '<option value="withInstructions" ' + (phaseFilter === 'withInstructions' ? 'selected' : '') + '>With instructions</option>' +
          '<option value="judge" ' + (phaseFilter === 'judge' ? 'selected' : '') + '>Judge</option>' +
          '</select>' +
          '</label>' +
          '</div>' +
          '<div class="section">' +
          '<h3>Overview</h3>' +
          '<div class="info-box">' +
          '<p><strong>Prompt:</strong> ' + escapeHtml(result.prompt ?? '') + '</p>' +
          '<p><strong>Expectation:</strong> ' + escapeHtml(result.expectation ?? '') + '</p>' +
          (result.rationale ? '<p><strong>Rationale:</strong> ' + escapeHtml(result.rationale) + '</p>' : '') +
          '</div>' +
          '</div>' +
          '<div class="section">' +
          '<h3>Performance Metrics</h3>' +
          renderMetrics(result.metrics) +
          '</div>' +
          '<div class="section">' +
          '<h3>Tool Usage Summary</h3>' +
          '<div class="muted" style="margin-bottom: 12px;">Total tool calls: ' + toolCounts.total + '</div>' +
          renderToolChips(toolCounts, 12) +
          '<div style="margin-top: 20px;">' +
          '<h4 style="font-size: 14px; color: #cbd5e1; margin-bottom: 12px;">By Phase</h4>' +
          '<div style="display: grid; gap: 12px;">' +
          '<div class="metric-card">' +
          '<span class="chip phase">withoutInstructions</span>' +
          '<div class="muted" style="margin-top: 8px;">' + toolCountsWithout.total + ' calls</div>' +
          renderToolChips(toolCountsWithout, 6) +
          '</div>' +
          '<div class="metric-card">' +
          '<span class="chip phase">withInstructions</span>' +
          '<div class="muted" style="margin-top: 8px;">' + toolCountsWith.total + ' calls</div>' +
          renderToolChips(toolCountsWith, 6) +
          '</div>' +
          '<div class="metric-card">' +
          '<span class="chip phase">judge</span>' +
          '<div class="muted" style="margin-top: 8px;">' + toolCountsJudge.total + ' calls</div>' +
          renderToolChips(toolCountsJudge, 6) +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div class="section">' +
          '<h3>Event Trajectory <span class="muted">(' + (result.trajectory?.length ?? 0) + ' events)</span></h3>' +
          renderTrajectory(result.trajectory) +
          '</div>';

        const toolsCheckbox = document.getElementById('toolsOnly');
        if (toolsCheckbox) {
          toolsCheckbox.addEventListener('change', (event) => {
            toolsOnly = event.target.checked;
            renderCaseDetails(activeCaseId);
          });
        }

        const phaseSelect = document.getElementById('phaseFilter');
        if (phaseSelect) {
          phaseSelect.addEventListener('change', (event) => {
            phaseFilter = event.target.value || 'all';
            renderCaseDetails(activeCaseId);
          });
        }
      }

      renderOverallToolSummary();
      renderCaseDetails(results[0]?.id);
    </script>
  </body>
</html>`;
}

function sanitizeEventData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "deltaContent" && typeof value === "string") {
      sanitized.deltaChars = value.length;
      sanitized.deltaPreview = value.slice(0, 120);
      continue;
    }
    sanitized[key] = sanitizeValue(value, 0);
  }
  return sanitized;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 4) return "[depth-limit]";
  if (typeof value === "string") {
    return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((entry) => sanitizeValue(entry, depth + 1));
  }
  if (value && typeof value === "object") {
    const obj: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      obj[key] = sanitizeValue(entry, depth + 1);
    }
    return obj;
  }
  return value;
}
