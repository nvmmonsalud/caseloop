import { describe, expect, it, vi } from "vitest";

import {
  FacultyAnalyticsAccessError,
  FacultyAnalyticsDataError,
  getAuthorizedFacultyCohortSummary,
  parseFacultyCohortSummary,
} from "./faculty-analytics";

const validAggregate = {
  suppressed: false,
  minimumCohortSize: 5,
  completed: 5,
  averageConfidence: 74.3,
  positions: { Acquisition: 2, "Joint venture": 2, "Organic entry": 1 },
  representativeArguments: [
    {
      anonymousKey: "A01",
      position: "joint_venture",
      rationale: "A staged commitment preserves options.",
      evidence: ["S2", "S5"],
    },
  ],
};

describe("faculty cohort analytics", () => {
  it("allows a faculty caller to load and normalize the aggregate RPC response", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: validAggregate, error: null });
    const summary = await getAuthorizedFacultyCohortSummary({ role: "faculty", rpc });

    expect(rpc).toHaveBeenCalledOnce();
    expect(summary.suppressed).toBe(false);
    if (summary.suppressed) throw new Error("Expected a released cohort aggregate");
    expect(summary.representativeArguments[0].position).toBe("Joint venture");
  });

  it("rejects a student before the aggregate RPC is called", async () => {
    const rpc = vi.fn();

    await expect(getAuthorizedFacultyCohortSummary({ role: "student", rpc })).rejects.toBeInstanceOf(
      FacultyAnalyticsAccessError,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when the RPC denies access to an assignment from another course", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Faculty access required" },
    });

    await expect(getAuthorizedFacultyCohortSummary({ role: "faculty", rpc })).rejects.toBeInstanceOf(
      FacultyAnalyticsDataError,
    );
  });

  it("rejects malformed aggregate output", () => {
    expect(() => parseFacultyCohortSummary({ ...validAggregate, completed: "3" })).toThrow(
      FacultyAnalyticsDataError,
    );
  });

  it("accepts suppression metadata without exposing the sub-threshold count", () => {
    const suppressed = parseFacultyCohortSummary({
      suppressed: true,
      minimumCohortSize: 5,
    });

    expect(suppressed).toEqual({ suppressed: true, minimumCohortSize: 5 });
    expect(suppressed).not.toHaveProperty("completed");
    expect(suppressed).not.toHaveProperty("representativeArguments");
  });

  it("rejects aggregate release below the declared threshold", () => {
    expect(() => parseFacultyCohortSummary({
      ...validAggregate,
      completed: 4,
      positions: { Acquisition: 1, "Joint venture": 2, "Organic entry": 1 },
    })).toThrow(FacultyAnalyticsDataError);
  });

  it("rejects identity and private-response fields instead of passing them to the UI", () => {
    const withPii = {
      ...validAggregate,
      representativeArguments: [
        {
          ...validAggregate.representativeArguments[0],
          studentId: "user-123",
          email: "student@example.com",
          preparationBrief: "Private content",
        },
      ],
    };

    expect(() => parseFacultyCohortSummary(withPii)).toThrow(FacultyAnalyticsDataError);
  });

  it("rejects PII fields even when the cohort is suppressed", () => {
    expect(() => parseFacultyCohortSummary({
      suppressed: true,
      minimumCohortSize: 5,
      studentIds: ["user-123"],
    })).toThrow(FacultyAnalyticsDataError);
  });
});
