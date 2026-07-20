import { z } from "zod";

const reasoningEffortSchema = z.enum([
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
]);

const gatewayModelSchema = z.enum([
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
]);

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export function getAIConfig() {
  return {
    live: process.env.DEMO_MODE === "false",
    model: gatewayModelSchema.parse(
      process.env.AI_GATEWAY_MODEL || "openai/gpt-5.6-terra",
    ),
    reasoningEffort: reasoningEffortSchema.parse(
      process.env.AI_REASONING_EFFORT || "medium",
    ),
    timeoutMs: boundedInteger(
      process.env.AI_REQUEST_TIMEOUT_MS,
      30_000,
      5_000,
      60_000,
    ),
    maxOutputTokens: boundedInteger(
      process.env.AI_MAX_OUTPUT_TOKENS,
      2_000,
      500,
      8_000,
    ),
    fallbackOnError: process.env.AI_FALLBACK_ON_ERROR !== "false",
  } as const;
}

export type AIReasoningEffort = z.infer<typeof reasoningEffortSchema>;
