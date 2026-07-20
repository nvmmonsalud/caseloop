import { describe, expect, it } from "vitest";

import { parsePilotSettings } from "./pilot-settings";

describe("faculty-controlled rubric and feedback release", () => {
  it("accepts a bounded rubric and released shared feedback", () => {
    const result = parsePilotSettings({
      rubric: [
        { title: "Evidence use", description: "Ground claims in case sources.", weight: 40 },
        { title: "Trade-offs", description: "Compare speed, control, and capital.", weight: 60 },
      ],
      rubricReleasedAt: "2026-07-20T00:00:00.000Z",
      feedback: { title: "Class synthesis", body: "Revisit the control assumptions.", releasedAt: "2026-07-20T00:00:00.000Z" },
    });
    expect(result.rubric.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(100);
  });

  it("fails closed on overweight, unknown, or unreleased feedback fields", () => {
    expect(() => parsePilotSettings({ rubric: [{ title: "Only", description: "x", weight: 90 }], secret: true })).toThrow();
    expect(() =>
      parsePilotSettings({
        rubric: [
          { title: "A", description: "x", weight: 60 },
          { title: "B", description: "y", weight: 60 },
        ],
      }),
    ).toThrow();
  });
});
