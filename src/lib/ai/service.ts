import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  Output,
} from "ai";
import { z } from "zod";
import { getAIConfig } from "./config";
import { getDemoFallback } from "./fallbacks";
import { prompts } from "./prompts";
import { schemas, type AIFeature } from "./schemas";

export type AIMode = "demo" | "live" | "fallback";
export type AIGenerationUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function sourceIdsFromInput(input: unknown) {
  if (!input || typeof input !== "object") return new Set<string>();
  const sources = (input as { caseSources?: unknown }).caseSources;
  if (!Array.isArray(sources)) return new Set<string>();
  return new Set(
    sources.flatMap((source) =>
      source && typeof source === "object" && typeof source.id === "string"
        ? [source.id]
        : [],
    ),
  );
}

function validateFeatureRules(
  feature: AIFeature,
  output: Record<string, unknown>,
  input: unknown,
) {
  const availableSources = sourceIdsFromInput(input);
  const citedSources =
    feature === "coach"
      ? (output.sourceIds as string[])
      : feature === "brief"
        ? (output.evidence as Array<{ sourceId: string }>).map(
            (item) => item.sourceId,
          )
        : feature === "cohort"
          ? (output.overlookedSourceIds as string[])
          : [];

  if (
    citedSources.some(
      (sourceId) =>
        availableSources.size === 0 || !availableSources.has(sourceId),
    )
  ) {
    throw new AIServiceError(
      "AI output referenced a source that was not supplied.",
      502,
    );
  }

  if (feature === "plan") {
    const duration = Number(
      input && typeof input === "object"
        ? (input as { duration?: unknown }).duration
        : 0,
    );
    const plannedMinutes = (
      output.segments as Array<{ minutes: number }>
    ).reduce((total, segment) => total + segment.minutes, 0);
    if (duration > 0 && plannedMinutes !== duration) {
      throw new AIServiceError(
        "AI output did not match the requested discussion duration.",
        502,
      );
    }
  }
}

function fallback(feature: AIFeature, input: unknown, mode: AIMode) {
  return {
    data: schemas[feature].parse(getDemoFallback(feature, input)),
    mode,
  };
}

function logGenerationFailure(
  feature: AIFeature,
  model: string,
  error: unknown,
) {
  const cause = error instanceof Error ? error.cause : undefined;
  console.error("CaseFlow AI generation failed", {
    feature,
    model,
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    statusCode: APICallError.isInstance(error) ? error.statusCode : undefined,
    cause:
      cause instanceof Error
        ? { name: cause.name, message: cause.message }
        : undefined,
  });
}

export async function runAI(feature: AIFeature, input: unknown) {
  const config = getAIConfig();
  if (!config.live) return fallback(feature, input, "demo");

  try {
    const { data } = await generateLiveAI(feature, input, config);
    return { data, mode: "live" as const };
  } catch (error) {
    logGenerationFailure(feature, config.model, error);
    if (config.fallbackOnError) return fallback(feature, input, "fallback");
    throw mapAIError(error);
  }
}

export async function generateLiveAI(
  feature: AIFeature,
  input: unknown,
  config = getAIConfig(),
) {
  const schema = schemas[feature] as unknown as z.ZodType<
    Record<string, unknown>
  >;
  const result = await generateText({
    model: config.model,
    system: prompts[feature],
    prompt: JSON.stringify(input),
    reasoning: config.reasoningEffort,
    maxOutputTokens: config.maxOutputTokens,
    maxRetries: 1,
    timeout: config.timeoutMs,
    output: Output.object({
      name: `caseflow_${feature}`,
      description: `Validated CaseFlow ${feature} response`,
      schema,
    }),
    providerOptions: {
      gateway: {
        tags: [`feature:${feature}`, "product:caseloop"],
      },
    },
  });

  const data = schema.parse(result.output);
  validateFeatureRules(feature, data, input);
  const usage: AIGenerationUsage = {
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
  };
  return { data, usage, model: config.model };
}

function mapAIError(error: unknown) {
  if (error instanceof AIServiceError) return error;

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return new AIServiceError(
        "The coach is busy. Try again in a moment.",
        429,
      );
    }
    if (error.statusCode === 402) {
      return new AIServiceError(
        "The live AI budget is temporarily unavailable.",
        503,
      );
    }
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" || /timeout|timed out/i.test(error.message))
  ) {
    return new AIServiceError(
      "The model timed out. Your work is saved; please retry.",
      504,
    );
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    return new AIServiceError(
      "AI output could not be validated. Please retry or use demo mode.",
      502,
    );
  }

  return new AIServiceError(
    "The live AI service is temporarily unavailable.",
    502,
  );
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}
