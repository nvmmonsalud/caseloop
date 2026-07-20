import { describe, expect, it, vi } from "vitest";

import {
  FacultyAnalyticsAccessError,
  FacultyAnalyticsDataError,
  getAuthorizedFacultyCohortSummary,
  parseFacultyCohortSummary,
} from "./faculty-analytics";

const validAggregate = {
  completed: 3,
  averageConfidence: 74.3,
  positions: { Acquisition: 1, "Joint venture": 1, "Organic entry": 1 },
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
    expect(summary.representativeArguments[0].position).toBe("Joint venture");
  });

  it("rejects a student before the aggregate RPC is called", async () => {
    const rpc = vi.fn();

    await expect(getAuthorizedFacultyCohortSummary({ role: "student", rpc })).rejects.toBeInstanceOf(
      FacultyAnalyticsAccessError,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed aggregate output", () => {
    expect(() => parseFacultyCohortSummary({ ...validAggregate, completed: "3" })).toThrow(
      FacultyAnalyticsDataError,
    );
  });

  it("normalizes an empty cohort without dividing by zero", () => {
    const empty = parseFacultyCohortSummary({
      completed: 0,
      averageConfidence: null,
      positions: { Acquisition: 0, "Joint venture": 0, "Organic entry": 0 },
      representativeArguments: [],
    });

    expect(empty.averageConfidence).toBe(0);
    expect(empty.representativeArguments).toEqual([]);
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
});
