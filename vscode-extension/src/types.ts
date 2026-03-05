/**
 * Re-export AgentRC CLI types for use in the extension.
 */
export type {
  RepoAnalysis,
  AgentrcConfig,
  AgentrcConfigWorkspace,
  AgentrcConfigArea
} from "@agentrc/core/services/analyzer";

export type {
  ReadinessReport,
  ReadinessPillarSummary,
  ReadinessCriterionResult,
  ReadinessLevelSummary
} from "@agentrc/core/services/readiness";
