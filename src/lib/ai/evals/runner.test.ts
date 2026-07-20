import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_EVAL_THRESHOLDS,
  estimateCostUsd,
  runEvalSuite,
} from "./runner";

describe("runEvalSuite", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("runs all five workflows offline without enabling live AI", async () => {
    vi.stubEnv("DEMO_MODE", "false");

    const report = await runEvalSuite({ mode: "offline" });

    expect(report.mode).toBe("offline");
    expect(report.cases.map((item) => item.feature).sort()).toEqual([
      "brief",
      "coach",
      "cohort",
      "plan",
      "reflection",
    ]);
    expect(report.summary.totalCases).toBe(5);
    expect(report.summary.failedCases).toBe(0);
    expect(report.summary.totalTokens).toBe(0);
    expect(report.passed).toBe(true);
    expect(process.env.DEMO_MODE).toBe("false");
  });

  it("documents strict critical checks and a high overall threshold", () => {
    expect(AI_EVAL_THRESHOLDS.criticalPassRate).toBe(1);
    expect(AI_EVAL_THRESHOLDS.overallPassRate).toBeGreaterThanOrEqual(0.9);
    expect(AI_EVAL_THRESHOLDS.casePassRate).toBeGreaterThanOrEqual(0.8);
  });

  it("estimates Terra usage from explicit input and output token rates", () => {
    expect(
      estimateCostUsd("openai/gpt-5.6-terra", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        totalTokens: 2_000_000,
      }),
    ).toBe(17.5);
  });

  it("refuses live evaluation without the explicit spend acknowledgement", async () => {
    vi.stubEnv("CASEFLOW_EVAL_LIVE", "true");

    await expect(runEvalSuite({ mode: "live" })).rejects.toThrow(
      "CASEFLOW_EVAL_ALLOW_SPEND",
    );
  });
});
