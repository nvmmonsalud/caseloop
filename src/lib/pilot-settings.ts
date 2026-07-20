import { z } from "zod";

export const rubricCriterionSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(500),
  weight: z.number().int().min(5).max(100),
}).strict();

export const pilotSettingsSchema = z.object({
  rubric: z.array(rubricCriterionSchema).max(8),
  rubricReleasedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  feedback: z.object({
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(1).max(4_000),
    releasedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  }).strict().nullable().optional(),
}).strict().superRefine((settings, context) => {
  if (settings.rubric.length > 0 && settings.rubric.reduce((sum, criterion) => sum + criterion.weight, 0) !== 100) {
    context.addIssue({ code: "custom", path: ["rubric"], message: "Rubric weights must total 100%." });
  }
});

export type PilotSettings = z.infer<typeof pilotSettingsSchema>;

export function parsePilotSettings(input: unknown) {
  return pilotSettingsSchema.parse(input);
}

export const defaultPilotSettings: PilotSettings = {
  rubric: [
    { title: "Evidence use", description: "Ground claims in the provided case sources.", weight: 40 },
    { title: "Assumption quality", description: "Separate known facts from assumptions and uncertainty.", weight: 30 },
    { title: "Trade-off reasoning", description: "Compare speed, control, capital, and execution risk.", weight: 30 },
  ],
  rubricReleasedAt: null,
  feedback: null,
};
