import { z } from "zod";
export const coachSchema=z.object({question:z.string(),challenge:z.string(),sourceIds:z.array(z.string()),inference:z.string()});
export const briefSchema=z.object({recommendation:z.string(),evidence:z.array(z.object({claim:z.string(),sourceId:z.string()})),assumptions:z.array(z.string()),tradeoffs:z.string(),counterargument:z.string(),openQuestion:z.string(),confidence:z.number().min(0).max(100)});
export const cohortSchema=z.object({misconceptions:z.array(z.object({title:z.string(),evidence:z.string(),count:z.number()})),overlookedSourceIds:z.array(z.string()),discussionTensions:z.array(z.string())});
export const planSchema=z.object({openingQuestion:z.string(),segments:z.array(z.object({minutes:z.number(),title:z.string(),prompt:z.string()})),boardPlan:z.array(z.string()),closingSynthesis:z.string()});
export const reflectionSchema=z.object({positionShift:z.string(),reasoningShift:z.string(),weakenedAssumption:z.string(),newEvidence:z.string()});
export const schemas={coach:coachSchema,brief:briefSchema,cohort:cohortSchema,plan:planSchema,reflection:reflectionSchema};
export type AIFeature=keyof typeof schemas;
