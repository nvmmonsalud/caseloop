import { describe, expect, it } from "vitest";
import { fallbacks, getDemoFallback } from "./fallbacks";
import { socraticPrompt } from "./prompts/socratic";
import { briefSchema, coachSchema, planSchema } from "./schemas";

describe("AI structured outputs", () => {
  it("validates the coach fallback", () =>
    expect(coachSchema.safeParse(fallbacks.coach).success).toBe(true));

  it("normalizes punctuation and inference labels", () => {
    const coach = coachSchema.parse(
      getDemoFallback("coach", {
        student: {
          recommendation: "Use a joint venture.",
          evidence: "Partner reach [S5].",
        },
      }),
    );
    expect(coach.question).not.toContain(".”.");
    expect(coach.inference).not.toMatch(/^AI inference:/);
  });

  it("keeps the Socratic coach from choosing for the student", () => {
    expect(socraticPrompt).toContain("Do not name a preferred entry mode");
    expect(socraticPrompt).toContain("The student must make the decision");
  });

  it("validates the preparation brief fallback", () =>
    expect(briefSchema.safeParse(fallbacks.brief).success).toBe(true));

  it("uses the student's committed position in demo mode", () => {
    const output = getDemoFallback("brief", {
      student: {
        position: "Organic entry",
        rationale: "Learn before scaling",
        evidence: "Consumer fit [S3]",
        risk: "Slow reach.",
        mitigation: "Pilot first.",
        confidence: 62,
      },
    });
    const brief = briefSchema.parse(output);
    expect(brief.recommendation).toContain("Organic entry");
    expect(brief.tradeoffs).not.toContain("..");
  });

  it("creates a real 90-minute plan", () => {
    const plan = planSchema.parse(getDemoFallback("plan", { duration: 90 }));
    expect(plan.segments.reduce((sum, item) => sum + item.minutes, 0)).toBe(90);
  });

  it("rejects unknown source IDs and out-of-range confidence", () => {
    expect(
      coachSchema.safeParse({ ...fallbacks.coach, sourceIds: ["S100"] }).success,
    ).toBe(false);
    expect(
      briefSchema.safeParse({ ...fallbacks.brief, confidence: 120 }).success,
    ).toBe(false);
  });
});
