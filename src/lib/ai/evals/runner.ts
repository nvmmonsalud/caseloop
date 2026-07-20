import { getAIConfig } from "../config";
import { getDemoFallback } from "../fallbacks";
import { prompts } from "../prompts";
import { generateLiveAI } from "../service";
import { aiEvalFixtures } from "./fixtures";
import { scoreEvalOutput } from "./scorers";
import type {
  AIEvalCaseResult,
  AIEvalReport,
  AIEvalUsage,
  EvalMode,
} from "./types";

export const AI_EVAL_THRESHOLDS = {
  casePassRate: 0.8,
  overallPassRate: 0.9,
  criticalPassRate: 1,
} as const;

const modelRatesPerMillionTokens = {
  "openai/gpt-5.6-sol": { input: 5, output: 30 },
  "openai/gpt-5.6-terra": { input: 2.5, output: 15 },
  "openai/gpt-5.6-luna": { input: 1, output: 6 },
} as const;

function boundedNumber(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function estimateCostUsd(
  model: keyof typeof modelRatesPerMillionTokens,
  usage: AIEvalUsage,
) {
  const rates = modelRatesPerMillionTokens[model];
  return (
    (usage.inputTokens * rates.input + usage.outputTokens * rates.output) /
    1_000_000
  );
}

function assertLiveOptIn() {
  if (process.env.CASEFLOW_EVAL_LIVE !== "true") {
    throw new Error(
      "Live evaluation requires CASEFLOW_EVAL_LIVE=true. Offline mode is the default.",
    );
  }
  if (
    process.env.CASEFLOW_EVAL_ALLOW_SPEND !==
    "I_UNDERSTAND_THIS_COSTS_MONEY"
  ) {
    throw new Error(
      "Live evaluation requires CASEFLOW_EVAL_ALLOW_SPEND=I_UNDERSTAND_THIS_COSTS_MONEY.",
    );
  }
  if (
    !process.env.AI_GATEWAY_API_KEY &&
    !process.env.VERCEL_OIDC_TOKEN
  ) {
    throw new Error(
      "Live evaluation requires a server-only AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.",
    );
  }
}

function liveLimits() {
  return {
    maxTotalTokens: Math.floor(
      boundedNumber(
        process.env.CASEFLOW_EVAL_MAX_TOTAL_TOKENS,
        10_000,
        1_000,
        50_000,
      ),
    ),
    maxCostUsd: boundedNumber(
      process.env.CASEFLOW_EVAL_MAX_COST_USD,
      0.25,
      0.01,
      5,
    ),
    maxOutputTokens: Math.floor(
      boundedNumber(
        process.env.CASEFLOW_EVAL_MAX_OUTPUT_TOKENS,
        1_200,
        500,
        2_000,
      ),
    ),
  };
}

function preflightLiveBudget() {
  assertLiveOptIn();
  const baseConfig = getAIConfig();
  const limits = liveLimits();
  const inputTokens = aiEvalFixtures.reduce(
    (total, fixture) =>
      total +
      estimateTokens(prompts[fixture.feature]) +
      estimateTokens(JSON.stringify(fixture.input)),
    0,
  );
  const worstCaseUsage: AIEvalUsage = {
    inputTokens,
    outputTokens: limits.maxOutputTokens * aiEvalFixtures.length,
    totalTokens:
      inputTokens + limits.maxOutputTokens * aiEvalFixtures.length,
  };
  const worstCaseCost = estimateCostUsd(baseConfig.model, worstCaseUsage);

  if (worstCaseUsage.totalTokens > limits.maxTotalTokens) {
    throw new Error(
      `Live eval preflight needs up to ${worstCaseUsage.totalTokens} tokens, above CASEFLOW_EVAL_MAX_TOTAL_TOKENS=${limits.maxTotalTokens}.`,
    );
  }
  if (worstCaseCost > limits.maxCostUsd) {
    throw new Error(
      `Live eval preflight estimates up to $${worstCaseCost.toFixed(4)}, above CASEFLOW_EVAL_MAX_COST_USD=$${limits.maxCostUsd.toFixed(4)}.`,
    );
  }

  return {
    config: {
      ...baseConfig,
      live: true,
      fallbackOnError: false,
      maxOutputTokens: limits.maxOutputTokens,
    },
    limits,
  };
}

function summarize(
  mode: EvalMode,
  model: string,
  cases: AIEvalCaseResult[],
): AIEvalReport {
  const checks = cases.flatMap((item) => item.checks);
  const criticalChecks = checks.filter((item) => item.critical);
  const passedChecks = checks.filter((item) => item.passed).length;
  const passedCriticalChecks = criticalChecks.filter(
    (item) => item.passed,
  ).length;
  const overallPassRate = checks.length === 0 ? 0 : passedChecks / checks.length;
  const criticalPassRate =
    criticalChecks.length === 0
      ? 0
      : passedCriticalChecks / criticalChecks.length;
  const passedCases = cases.filter((item) => item.passed).length;
  const summary = {
    totalCases: cases.length,
    passedCases,
    failedCases: cases.length - passedCases,
    passedChecks,
    totalChecks: checks.length,
    overallPassRate,
    criticalPassRate,
    inputTokens: cases.reduce(
      (total, item) => total + item.usage.inputTokens,
      0,
    ),
    outputTokens: cases.reduce(
      (total, item) => total + item.usage.outputTokens,
      0,
    ),
    totalTokens: cases.reduce(
      (total, item) => total + item.usage.totalTokens,
      0,
    ),
    estimatedCostUsd: cases.reduce(
      (total, item) => total + item.estimatedCostUsd,
      0,
    ),
  };
  const passed =
    cases.length === aiEvalFixtures.length &&
    summary.failedCases === 0 &&
    overallPassRate >= AI_EVAL_THRESHOLDS.overallPassRate &&
    criticalPassRate >= AI_EVAL_THRESHOLDS.criticalPassRate;

  return {
    version: 1,
    mode,
    model,
    generatedAt: new Date().toISOString(),
    thresholds: AI_EVAL_THRESHOLDS,
    summary,
    cases,
    passed,
  };
}

export async function runEvalSuite({ mode }: { mode: EvalMode }) {
  const live = mode === "live" ? preflightLiveBudget() : null;
  const model = live?.config.model || "deterministic-fallback";
  const cases: AIEvalCaseResult[] = [];

  for (const fixture of aiEvalFixtures) {
    const startedAt = performance.now();
    try {
      const generated = live
        ? await generateLiveAI(fixture.feature, fixture.input, live.config)
        : {
            data: getDemoFallback(fixture.feature, fixture.input),
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          };
      const scored = scoreEvalOutput(fixture, generated.data);
      const usage = generated.usage;

      if (live && usage.totalTokens <= 0) {
        throw new Error("Live Gateway response omitted token usage.");
      }

      const estimatedCostUsd = live
        ? estimateCostUsd(live.config.model, usage)
        : 0;
      const checks = [...scored.checks];
      if (live) {
        const consumedTokens =
          cases.reduce((total, item) => total + item.usage.totalTokens, 0) +
          usage.totalTokens;
        const consumedCost =
          cases.reduce((total, item) => total + item.estimatedCostUsd, 0) +
          estimatedCostUsd;
        checks.push({
          id: "live-budget",
          passed:
            consumedTokens <= live.limits.maxTotalTokens &&
            consumedCost <= live.limits.maxCostUsd,
          critical: true,
          message: "Cumulative live usage remains within configured token and cost limits.",
        });
      }

      const passedChecks = checks.filter((item) => item.passed).length;
      const score = passedChecks / checks.length;
      const passed =
        score >= AI_EVAL_THRESHOLDS.casePassRate &&
        !checks.some((item) => item.critical && !item.passed);
      cases.push({
        fixtureId: fixture.id,
        feature: fixture.feature,
        mode: live ? "live" : "demo",
        passed,
        score,
        durationMs: Math.round(performance.now() - startedAt),
        usage,
        estimatedCostUsd,
        checks,
      });

      if (live && !checks.at(-1)?.passed) break;
    } catch {
      cases.push({
        fixtureId: fixture.id,
        feature: fixture.feature,
        mode: live ? "live" : "demo",
        passed: false,
        score: 0,
        durationMs: Math.round(performance.now() - startedAt),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        estimatedCostUsd: 0,
        checks: [
          {
            id: "generation",
            passed: false,
            critical: true,
            message: "Generation failed; prompts and provider response were not logged.",
          },
        ],
      });
      if (live) break;
    }
  }

  return summarize(mode, model, cases);
}
