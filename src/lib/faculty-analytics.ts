import { z } from "zod";

import { cohortMetrics } from "./analytics";
import { studentResponses } from "./data";

const sourceIdSchema = z.string().regex(/^S\d{1,2}$/);
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

const minimumCohortSizeSchema = z.number().int().min(5).max(50);

const releasedCohortSummarySchema = z
  .object({
    suppressed: z.literal(false),
    minimumCohortSize: minimumCohortSizeSchema,
    completed: z.number().int().nonnegative(),
    averageConfidence: z.number().min(0).max(100),
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
    if (summary.completed < summary.minimumCohortSize) {
      context.addIssue({
        code: "custom",
        message: "Released cohort data must meet the anonymity threshold.",
        path: ["completed"],
      });
    }
  });

const suppressedCohortSummarySchema = z
  .object({
    suppressed: z.literal(true),
    minimumCohortSize: minimumCohortSizeSchema,
  })
  .strict();

const cohortSummarySchema = z.discriminatedUnion("suppressed", [
  releasedCohortSummarySchema,
  suppressedCohortSummarySchema,
]);

export type FacultyCohortSummary = z.output<typeof cohortSummarySchema>;
export type ReleasedFacultyCohortSummary = z.output<typeof releasedCohortSummarySchema>;
export type RepresentativeArgument = ReleasedFacultyCohortSummary["representativeArguments"][number];

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
    suppressed: false,
    minimumCohortSize: 5,
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

export function getRepresentativeEvidenceCounts(summary: ReleasedFacultyCohortSummary) {
  return summary.representativeArguments
    .flatMap((argument) => argument.evidence)
    .reduce<Record<string, number>>((counts, sourceId) => {
      counts[sourceId] = (counts[sourceId] ?? 0) + 1;
      return counts;
    }, {});
}
