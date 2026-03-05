import { describe, expect, it } from "vitest";

/**
 * Facade boundary test — ensures every symbol the extension imports
 * from CLI services remains defined with the expected type.
 *
 * If a refactor moves or renames an export, this test will fail,
 * catching the break before the extension build does.
 */
describe("extension facade boundary", () => {
  it("exports all analyzer symbols", async () => {
    const mod = await import("@agentrc/core/services/analyzer");
    expect(typeof mod.analyzeRepo).toBe("function");
    expect(typeof mod.loadAgentrcConfig).toBe("function");
    expect(typeof mod.detectWorkspaces).toBe("function");
  });

  it("exports generator symbol", async () => {
    const mod = await import("@agentrc/core/services/generator");
    expect(typeof mod.generateConfigs).toBe("function");
  });

  it("exports all instructions symbols", async () => {
    const mod = await import("@agentrc/core/services/instructions");
    expect(typeof mod.generateCopilotInstructions).toBe("function");
    expect(typeof mod.generateAreaInstructions).toBe("function");
    expect(typeof mod.generateNestedInstructions).toBe("function");
    expect(typeof mod.generateNestedAreaInstructions).toBe("function");
    expect(typeof mod.writeAreaInstruction).toBe("function");
    expect(typeof mod.writeNestedInstructions).toBe("function");
  });

  it("exports evaluator symbol", async () => {
    const mod = await import("@agentrc/core/services/evaluator");
    expect(typeof mod.runEval).toBe("function");
  });

  it("exports evalScaffold symbol", async () => {
    const mod = await import("@agentrc/core/services/evalScaffold");
    expect(typeof mod.generateEvalScaffold).toBe("function");
  });

  it("exports all readiness symbols", async () => {
    const mod = await import("@agentrc/core/services/readiness");
    expect(typeof mod.runReadinessReport).toBe("function");
    expect(typeof mod.groupPillars).toBe("function");
    expect(typeof mod.getLevelName).toBe("function");
    expect(typeof mod.getLevelDescription).toBe("function");
  });

  it("exports visualReport symbol", async () => {
    const mod = await import("@agentrc/core/services/visualReport");
    expect(typeof mod.generateVisualReport).toBe("function");
  });

  it("exports github symbol", async () => {
    const mod = await import("@agentrc/core/services/github");
    expect(typeof mod.createPullRequest).toBe("function");
  });

  it("exports azureDevops symbols", async () => {
    const mod = await import("@agentrc/core/services/azureDevops");
    expect(typeof mod.createPullRequest).toBe("function");
    expect(typeof mod.getRepo).toBe("function");
  });

  it("exports pr utility symbol", async () => {
    const mod = await import("@agentrc/core/utils/pr");
    expect(typeof mod.isAgentrcFile).toBe("function");
  });

  it("exports fs utility symbol", async () => {
    const mod = await import("@agentrc/core/utils/fs");
    expect(typeof mod.safeWriteFile).toBe("function");
  });

  it("exports config symbol", async () => {
    const mod = await import("@agentrc/core/config");
    expect(typeof mod.DEFAULT_MODEL).toBe("string");
    expect(mod.DEFAULT_MODEL.length).toBeGreaterThan(0);
  });
});
