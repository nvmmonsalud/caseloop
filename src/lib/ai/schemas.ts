import { z } from "zod";

const conciseText = z.string().trim().min(1).max(2_000);
export const sourceIdSchema = z.string().regex(/^S\d{1,2}$/, "Use a supplied S-number source identifier.");

export const coachSchema = z.object({
  question: conciseText.describe("One open Socratic question, not an answer."),
  challenge: conciseText.describe("A concise competing perspective or evidence challenge."),
  sourceIds: z
    .array(sourceIdSchema)
    .min(1)
    .max(3)
    .describe("Only source IDs that directly ground the challenge."),
  inference: conciseText.describe("An explicit AI inference, not a case fact."),
});

export const briefSchema = z.object({
  recommendation: conciseText,
  evidence: z
    .array(
      z.object({
        claim: conciseText,
        sourceId: sourceIdSchema,
      }),
    )
    .min(1)
    .max(6),
  assumptions: z.array(conciseText).min(1).max(6),
  tradeoffs: conciseText,
  counterargument: conciseText,
  openQuestion: conciseText,
  confidence: z.number().min(0).max(100),
});

export const cohortSchema = z.object({
  misconceptions: z
    .array(
      z.object({
        title: conciseText,
        evidence: conciseText,
        count: z.number().int().nonnegative(),
      }),
    )
    .max(12),
  overlookedSourceIds: z.array(sourceIdSchema).max(12),
  discussionTensions: z.array(conciseText).max(8),
});

export const planSchema = z.object({
  openingQuestion: conciseText,
  segments: z
    .array(
      z.object({
        minutes: z.number().int().positive().max(90),
        title: conciseText,
        prompt: conciseText,
      }),
    )
    .min(1)
    .max(12),
  boardPlan: z.array(conciseText).min(1).max(10),
  closingSynthesis: conciseText,
});

export const reflectionSchema = z.object({
  positionShift: conciseText,
  reasoningShift: conciseText,
  weakenedAssumption: conciseText,
  newEvidence: conciseText,
});

export const schemas = {
  coach: coachSchema,
  brief: briefSchema,
  cohort: cohortSchema,
  plan: planSchema,
  reflection: reflectionSchema,
};

export type AIFeature = keyof typeof schemas;
