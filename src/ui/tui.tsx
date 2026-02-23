import React, { useMemo, useState } from "react";
import { Box, Key, Text, useApp, useInput } from "ink";
import fs from "fs/promises";
import path from "path";
import { analyzeRepo, RepoAnalysis } from "../services/analyzer";
import { generateCopilotInstructions } from "../services/instructions";
import { runEval, type EvalResult } from "../services/evaluator";
import { AnimatedBanner, StaticBanner } from "./AnimatedBanner";
import { BatchTui } from "./BatchTui";
import { getGitHubToken } from "../services/github";

type Props = {
  repoPath: string;
  skipAnimation?: boolean;
  accessible?: boolean;
};

type Status = "intro" | "idle" | "analyzing" | "generating" | "evaluating" | "preview" | "done" | "error" | "batch";

export function PrimerTui({ repoPath, skipAnimation = false, accessible = false }: Props): React.JSX.Element {
  const app = useApp();
  const [status, setStatus] = useState<Status>(skipAnimation ? "idle" : "intro");
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [message, setMessage] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [evalResults, setEvalResults] = useState<EvalResult[] | null>(null);
  const [batchToken, setBatchToken] = useState<string | null>(null);
  const repoLabel = useMemo(() => repoPath, [repoPath]);

  const handleAnimationComplete = () => {
    setStatus("idle");
  };

  useInput(async (input: string, key: Key) => {
    // During intro animation, any key skips it
    if (status === "intro") {
      setStatus("idle");
      return;
    }

    if (key.escape || input.toLowerCase() === "q") {
      app.exit();
      return;
    }

    // In preview mode, handle save/discard
    if (status === "preview") {
      if (input.toLowerCase() === "s") {
        try {
          const outputPath = path.join(repoPath, ".github", "copilot-instructions.md");
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, generatedContent, "utf8");
          setStatus("done");
          setMessage("Saved to .github/copilot-instructions.md");
          setGeneratedContent("");
        } catch (error) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Failed to save.");
        }
        return;
      }
      if (input.toLowerCase() === "d") {
        setStatus("idle");
        setMessage("Discarded generated instructions.");
        setGeneratedContent("");
        return;
      }
      return;
    }

    if (input.toLowerCase() === "a") {
      setStatus("analyzing");
      try {
        const result = await analyzeRepo(repoPath);
        setAnalysis(result);
        setStatus("done");
        setMessage("Analysis complete.");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Analysis failed.");
      }
      return;
    }

    if (input.toLowerCase() === "g") {
      setStatus("generating");
      setMessage("Starting generation...");
      try {
        const content = await generateCopilotInstructions({ 
          repoPath,
          onProgress: (msg) => setMessage(msg),
        });
        if (!content.trim()) {
          throw new Error("Copilot SDK returned empty instructions.");
        }
        setGeneratedContent(content);
        setStatus("preview");
        setMessage("Review the generated instructions below.");
      } catch (error) {
        setStatus("error");
        const message = error instanceof Error ? error.message : "Generation failed.";
        if (message.toLowerCase().includes("auth") || message.toLowerCase().includes("login")) {
          setMessage(`${message} Run 'copilot' then '/login' in a separate terminal.`);
        } else {
          setMessage(message);
        }
      }
    }

    if (input.toLowerCase() === "b") {
      setStatus("analyzing");
      setMessage("Checking GitHub authentication...");
      const token = await getGitHubToken();
      if (!token) {
        setStatus("error");
        setMessage("GitHub auth required. Run 'gh auth login' or set GITHUB_TOKEN.");
        return;
      }
      setBatchToken(token);
      setStatus("batch");
      return;
    }

    if (input.toLowerCase() === "e") {
      const configPath = path.join(repoPath, "primer.eval.json");
      try {
        await fs.access(configPath);
      } catch {
        setStatus("error");
        setMessage("No primer.eval.json found. Run 'primer eval --init' to create one.");
        return;
      }
      
      setStatus("evaluating");
      setMessage("Running evals... (this may take a few minutes)");
      setEvalResults(null);
      try {
        const { results } = await runEval({
          configPath,
          repoPath,
          model: "gpt-4.1",
          judgeModel: "gpt-4.1",
          // Note: onProgress removed - causes issues with SDK in React/Ink context
        });
        setEvalResults(results);
        const passed = results.filter(r => r.verdict === "pass").length;
        const failed = results.filter(r => r.verdict === "fail").length;
        setStatus("done");
        setMessage(`Eval complete: ${passed} pass, ${failed} fail out of ${results.length} cases.`);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Eval failed.");
      }
    }
  });

  const statusLabel = status === "intro" ? "..." : status === "idle" ? "ready (awaiting input)" : status;

  // Truncate preview to fit terminal
  const previewLines = generatedContent.split("\n").slice(0, 20);
  const truncatedPreview = previewLines.join("\n") + (generatedContent.split("\n").length > 20 ? "\n..." : "");

  // Render BatchTui when in batch mode
  if (status === "batch" && batchToken) {
    return <BatchTui token={batchToken} accessible={accessible} />;
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle={accessible ? undefined : "round"}>
      {status === "intro" ? (
        <AnimatedBanner onComplete={handleAnimationComplete} />
      ) : (
        <StaticBanner accessible={accessible} />
      )}
      <Text color="cyan">Prime your repo for AI.</Text>
      <Text color="gray">Repo: {repoLabel}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>Status: {statusLabel}</Text>
        {analysis && (
          <Box flexDirection="column" marginTop={1}>
            <Text>Languages: {analysis.languages.join(", ") || "unknown"}</Text>
            <Text>Frameworks: {analysis.frameworks.join(", ") || "none"}</Text>
            <Text>Package manager: {analysis.packageManager ?? "unknown"}</Text>
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Text>{message}</Text>
      </Box>
      {status === "preview" && generatedContent && (
        <Box flexDirection="column" marginTop={1} borderStyle={accessible ? undefined : "single"} borderColor="gray" paddingX={1}>
          <Text color="cyan" bold>Preview (.github/copilot-instructions.md):</Text>
          <Text color="gray">{truncatedPreview}</Text>
        </Box>
      )}
      {evalResults && evalResults.length > 0 && (
        <Box flexDirection="column" marginTop={1} borderStyle={accessible ? undefined : "single"} borderColor="gray" paddingX={1}>
          <Text color="cyan" bold>Eval Results:</Text>
          {evalResults.map((r) => (
            <Text key={r.id} color={r.verdict === "pass" ? "green" : r.verdict === "fail" ? "red" : "yellow"}>
              {r.verdict === "pass" ? (accessible ? "PASS" : "✓") : r.verdict === "fail" ? (accessible ? "FAIL" : "✗") : "?"} {r.id}: {r.verdict} (score: {r.score})
            </Text>
          ))}
        </Box>
      )}
      <Box marginTop={1}>
        {status === "intro" ? (
          <Text color="gray">Press any key to skip animation...</Text>
        ) : status === "preview" ? (
          <Text color="cyan">Keys: [S] Save  [D] Discard  [Q] Quit</Text>
        ) : (
          <Text color="cyan">Keys: [A] Analyze  [G] Generate  [E] Eval  [B] Batch  [Q] Quit</Text>
        )}
      </Box>
    </Box>
  );
}
