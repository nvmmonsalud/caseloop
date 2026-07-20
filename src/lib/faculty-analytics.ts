import { z } from "zod";

import { cohortMetrics } from "./analytics";
import { studentResponses } from "./data";

const sourceIdSchema = z.string().regex(/^S[1-5]$/);
const positionSchema = z
  .enum(["acquisition", "joint_venture", "organic_entry", "Acquisition", "Joint venture", "Organic entry"])
  .transform((position) => {
    if (position === "acquisition") return "Acquisition" as const;
    if (position === "joint_venture") return "Joint venture" as const;
    if (position === "organic_entry") return "Organic entry" as const;
    return position;
  });

const representativeArgumentSchema = z
  .object({
    anonymousKey: z.string().regex(/^A\d{2,}$/),
    position: positionSchema,
    rationale: z.string().trim().min(1).max(2_000),
    evidence: z.array(sourceIdSchema).max(5),
  })
  .strict();

const cohortSummarySchema = z
  .object({
    completed: z.number().int().nonnegative(),
    averageConfidence: z.number().min(0).max(100).nullable(),
    positions: z
      .object({
        Acquisition: z.number().int().nonnegative(),
        "Joint venture": z.number().int().nonnegative(),
        "Organic entry": z.number().int().nonnegative(),
      })
      .strict(),
    representativeArguments: z.array(representativeArgumentSchema).max(6),
  })
  .strict()
  .superRefine((summary, context) => {
    const positionTotal = Object.values(summary.positions).reduce((total, count) => total + count, 0);
    if (positionTotal !== summary.completed) {
      context.addIssue({
        code: "custom",
        message: "Position counts must equal the completed response count.",
        path: ["positions"],
      });
    }
  })
  .transform((summary) => ({
    ...summary,
    averageConfidence: summary.averageConfidence ?? 0,
  }));

export type FacultyCohortSummary = z.output<typeof cohortSummarySchema>;
export type RepresentativeArgument = FacultyCohortSummary["representativeArguments"][number];

export class FacultyAnalyticsAccessError extends Error {
  constructor() {
    super("Faculty access required");
    this.name = "FacultyAnalyticsAccessError";
  }
}

export class FacultyAnalyticsDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FacultyAnalyticsDataError";
  }
}

export function parseFacultyCohortSummary(input: unknown): FacultyCohortSummary {
  const parsed = cohortSummarySchema.safeParse(input);
  if (!parsed.success) {
    throw new FacultyAnalyticsDataError("The cohort aggregate returned an invalid response.", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export async function getAuthorizedFacultyCohortSummary({
  role,
  rpc,
}: {
  role: "student" | "faculty";
  rpc: () => Promise<{ data: unknown; error: { message: string } | null }>;
}): Promise<FacultyCohortSummary> {
  if (role !== "faculty") throw new FacultyAnalyticsAccessError();

  const { data, error } = await rpc();
  if (error) {
    throw new FacultyAnalyticsDataError(`Could not load the cohort aggregate: ${error.message}`);
  }
  return parseFacultyCohortSummary(data);
}

export function getDemoFacultyCohortSummary(): FacultyCohortSummary {
  const metrics = cohortMetrics();
  return parseFacultyCohortSummary({
    completed: metrics.completed,
    averageConfidence: metrics.averageConfidence,
    positions: metrics.positions,
    representativeArguments: studentResponses.slice(0, 6).map((response) => ({
      anonymousKey: response.id,
      position: response.position,
      rationale: response.rationale,
      evidence: response.evidence,
    })),
  });
}

export function getRepresentativeEvidenceCounts(summary: FacultyCohortSummary) {
  return summary.representativeArguments
    .flatMap((argument) => argument.evidence)
    .reduce<Record<string, number>>((counts, sourceId) => {
      counts[sourceId] = (counts[sourceId] ?? 0) + 1;
      return counts;
    }, {});
}
