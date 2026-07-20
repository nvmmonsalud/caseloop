import { describe, expect, it } from "vitest";
import { fallbacks } from "../fallbacks";
import { fixturesById } from "./fixtures";
import { scoreEvalOutput } from "./scorers";

describe("scoreEvalOutput", () => {
  it("accepts a grounded, Socratic coach response", () => {
    const result = scoreEvalOutput(
      fixturesById["coach-assumption-pressure-test"],
      fallbacks.coach,
    );

    expect(result.passed).toBe(true);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "schema", passed: true }),
        expect.objectContaining({ id: "citations", passed: true }),
        expect.objectContaining({ id: "socratic-question", passed: true }),
        expect.objectContaining({ id: "non-answer-giving", passed: true }),
      ]),
    );
  });

  it("rejects a coach that gives the student an answer", () => {
    const result = scoreEvalOutput(
      fixturesById["coach-assumption-pressure-test"],
      {
        ...fallbacks.coach,
        question: "You should choose the joint venture because it is the best choice.",
      },
    );

    expect(result.passed).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "non-answer-giving", passed: false }),
    );
  });

  it("rejects citations that were not supplied with the fictional case", () => {
    const result = scoreEvalOutput(
      fixturesById["coach-assumption-pressure-test"],
      {
        ...fallbacks.coach,
        challenge: "A hidden market survey [S9] disproves the student's claim.",
      },
    );

    expect(result.passed).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "citations", passed: false, critical: true }),
    );
  });

  it("rejects confidence that the model raises above the student's confidence", () => {
    const fixture = fixturesById["brief-preserves-committed-reasoning"];
    const result = scoreEvalOutput(fixture, {
      ...fallbacks.brief,
      confidence: 99,
    });

    expect(result.passed).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        id: "unsupported-high-confidence",
        passed: false,
        critical: true,
      }),
    );
  });

  it("requires reflection comparisons to carry forward newly cited evidence", () => {
    const fixture = fixturesById["reflection-evidence-shift"];
    const result = scoreEvalOutput(fixture, {
      ...fallbacks.reflection,
      newEvidence: "The discussion added more context.",
    });

    expect(result.passed).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "reflection-evidence", passed: false }),
    );
  });

  it("requires discussion plan minutes to equal the requested duration", () => {
    const result = scoreEvalOutput(fixturesById["plan-sixty-minutes"], {
      ...fallbacks.plan,
      segments: fallbacks.plan.segments.slice(0, 2),
    });

    expect(result.passed).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "duration", passed: false, critical: true }),
    );
  });
});
