import type { AIMode } from "../service";
import type { AIFeature } from "../schemas";

export type EvalMode = "offline" | "live";

export type AIEvalFixture = {
  id: string;
  feature: AIFeature;
  description: string;
  input: Record<string, unknown>;
};

export type AIEvalCheck = {
  id: string;
  passed: boolean;
  critical: boolean;
  message: string;
};

export type AIEvalUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AIEvalCaseResult = {
  fixtureId: string;
  feature: AIFeature;
  mode: AIMode;
  passed: boolean;
  score: number;
  durationMs: number;
  usage: AIEvalUsage;
  estimatedCostUsd: number;
  checks: AIEvalCheck[];
};

export type AIEvalThresholds = {
  casePassRate: number;
  overallPassRate: number;
  criticalPassRate: number;
};

export type AIEvalReport = {
  version: 1;
  mode: EvalMode;
  model: string;
  generatedAt: string;
  thresholds: AIEvalThresholds;
  summary: {
    totalCases: number;
    passedCases: number;
    failedCases: number;
    passedChecks: number;
    totalChecks: number;
    overallPassRate: number;
    criticalPassRate: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  cases: AIEvalCaseResult[];
  passed: boolean;
};
