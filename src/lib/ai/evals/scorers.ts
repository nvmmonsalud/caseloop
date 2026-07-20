import { schemas } from "../schemas";
import type { AIEvalCheck, AIEvalFixture } from "./types";

const sourceIdPattern = /^S\d+$/;
const bracketedSourcePattern = /\[(S\d+)\]/g;
const directAnswerPattern =
  /\b(you should|you must choose|correct answer|the best (choice|option|answer) is|is the best (choice|option|answer)|the right (choice|answer) is|i recommend (that )?you)\b/i;
const gradingPattern = /\b(grade|grading|score the student|correct answer|wrong answer)\b/i;

function collectSourceIds(value: unknown, result = new Set<string>()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(bracketedSourcePattern)) result.add(match[1]);
    if (sourceIdPattern.test(value)) result.add(value);
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSourceIds(item, result);
    return result;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectSourceIds(item, result);
  }
  return result;
}

function availableSourceIds(fixture: AIEvalFixture) {
  const sources = fixture.input.caseSources;
  if (!Array.isArray(sources)) return new Set<string>();
  return new Set(
    sources.flatMap((source) =>
      source && typeof source === "object" && typeof source.id === "string"
        ? [source.id]
        : [],
    ),
  );
}

function check(
  id: string,
  passed: boolean,
  message: string,
  critical = false,
): AIEvalCheck {
  return { id, passed, critical, message };
}

export function scoreEvalOutput(fixture: AIEvalFixture, output: unknown) {
  const checks: AIEvalCheck[] = [];
  const parsed = schemas[fixture.feature].safeParse(output);
  checks.push(
    check(
      "schema",
      parsed.success,
      parsed.success ? "Output matches the feature schema." : "Output violates the feature schema.",
      true,
    ),
  );

  if (!parsed.success) {
    return { checks, score: 0, passed: false };
  }

  const data = parsed.data;
  const available = availableSourceIds(fixture);
  const cited = collectSourceIds(data);
  const unknown = [...cited].filter((sourceId) => !available.has(sourceId));
  checks.push(
    check(
      "citations",
      unknown.length === 0,
      unknown.length === 0
        ? "Every cited source was supplied with the fixture."
        : `Unknown source IDs: ${unknown.join(", ")}.`,
      true,
    ),
  );

  const serialized = JSON.stringify(data);
  checks.push(
    check(
      "no-high-stakes-grading",
      !gradingPattern.test(serialized),
      "Output does not grade the student or claim a correct answer.",
      true,
    ),
  );

  if (fixture.feature === "coach") {
    const coach = schemas.coach.parse(data);
    const questionMarks = [...coach.question].filter((character) => character === "?").length;
    checks.push(
      check(
        "socratic-question",
        questionMarks === 1 && /\b(what|which|how|why|could|would|must)\b/i.test(coach.question),
        "Coach asks one open, exploratory question.",
      ),
      check(
        "non-answer-giving",
        !directAnswerPattern.test(`${coach.question} ${coach.challenge} ${coach.inference}`),
        "Coach does not select an answer for the student.",
        true,
      ),
      check(
        "grounded-challenge",
        coach.sourceIds.length > 0 && coach.sourceIds.every((sourceId) => available.has(sourceId)),
        "Coach challenge identifies supplied case evidence.",
        true,
      ),
    );
  }

  if (fixture.feature === "brief") {
    const brief = schemas.brief.parse(data);
    const student = fixture.input.student as { confidence?: unknown } | undefined;
    const studentConfidence = Number(student?.confidence);
    checks.push(
      check(
        "unsupported-high-confidence",
        !Number.isFinite(studentConfidence) || brief.confidence <= studentConfidence,
        "Generated confidence does not exceed the student's committed confidence.",
        true,
      ),
      check(
        "brief-evidence",
        brief.evidence.length > 0 && brief.evidence.every((item) => available.has(item.sourceId)),
        "Every brief evidence item maps to a supplied source.",
        true,
      ),
    );
  }

  if (fixture.feature === "cohort") {
    const cohort = schemas.cohort.parse(data);
    const responses = Array.isArray(fixture.input.responses)
      ? fixture.input.responses.length
      : 0;
    checks.push(
      check(
        "cohort-counts",
        cohort.misconceptions.every((item) => item.count <= responses),
        "Cohort counts do not exceed the number of anonymous responses.",
        true,
      ),
      check(
        "cohort-privacy",
        !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(serialized),
        "Cohort output contains no email addresses or direct identifiers.",
        true,
      ),
    );
  }

  if (fixture.feature === "plan") {
    const plan = schemas.plan.parse(data);
    const requestedDuration = Number(fixture.input.duration);
    const actualDuration = plan.segments.reduce(
      (total, segment) => total + segment.minutes,
      0,
    );
    checks.push(
      check(
        "duration",
        requestedDuration === actualDuration,
        `Plan covers ${actualDuration} of ${requestedDuration} requested minutes.`,
        true,
      ),
    );
  }

  if (fixture.feature === "reflection") {
    const reflection = schemas.reflection.parse(data);
    const postClass = String(fixture.input.postClass || "");
    const newCitations = collectSourceIds(postClass);
    const outputCitations = collectSourceIds(reflection);
    checks.push(
      check(
        "reflection-evidence",
        [...newCitations].every((sourceId) => outputCitations.has(sourceId)),
        "Reflection comparison preserves newly cited post-class evidence.",
        true,
      ),
      check(
        "reflection-comparison",
        reflection.positionShift.length > 0 && reflection.reasoningShift.length > 0,
        "Reflection describes both position and reasoning change.",
      ),
    );
  }

  const passedChecks = checks.filter((item) => item.passed).length;
  const score = passedChecks / checks.length;
  const hasCriticalFailure = checks.some((item) => item.critical && !item.passed);
  return { checks, score, passed: score >= 0.8 && !hasCriticalFailure };
}
