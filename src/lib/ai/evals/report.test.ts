import { describe, expect, it } from "vitest";
import { renderEvalJson, renderEvalMarkdown } from "./report";
import type { AIEvalReport } from "./types";

const report: AIEvalReport = {
  version: 1,
  mode: "offline",
  model: "deterministic-fallback",
  generatedAt: "2026-07-20T00:00:00.000Z",
  thresholds: {
    casePassRate: 0.8,
    overallPassRate: 0.9,
    criticalPassRate: 1,
  },
  summary: {
    totalCases: 1,
    passedCases: 1,
    failedCases: 0,
    passedChecks: 4,
    totalChecks: 4,
    overallPassRate: 1,
    criticalPassRate: 1,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  },
  cases: [
    {
      fixtureId: "coach-assumption-pressure-test",
      feature: "coach",
      mode: "demo",
      passed: true,
      score: 1,
      durationMs: 2,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      estimatedCostUsd: 0,
      checks: [
        { id: "schema", passed: true, critical: true, message: "valid" },
      ],
    },
  ],
  passed: true,
};

describe("eval report rendering", () => {
  it("renders parseable JSON without prompts, inputs, outputs, or secrets", () => {
    const text = renderEvalJson(report);
    const parsed = JSON.parse(text);

    expect(parsed.summary.overallPassRate).toBe(1);
    expect(text).not.toContain("systemPrompt");
    expect(text).not.toContain("AI_GATEWAY_API_KEY");
    expect(text).not.toContain('"input"');
    expect(text).not.toContain('"output"');
  });

  it("renders a concise Markdown scorecard", () => {
    const text = renderEvalMarkdown(report);

    expect(text).toContain("# CaseFlow AI evaluation");
    expect(text).toContain("coach-assumption-pressure-test");
    expect(text).toContain("PASS");
    expect(text).toContain("100.0%");
  });
});
