import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "migrations/20260720090000_pilot-feedback-ingestion.sql"),
  "utf8",
);

describe("pilot migration contract", () => {
  it("derives uploads from the seeded assignment instead of an unrelated case UUID", () => {
    expect(migration).toContain("SELECT assignment.case_id, assignment.course_id INTO case_uuid, course_uuid");
    expect(migration).not.toContain("20000000-0000-0000-0000-000000000001");
  });

  it("normalizes the legacy rubric before the strict runtime schema reads it", () => {
    expect(migration).toContain("AND jsonb_typeof(rubric) <> 'array'");
    expect(migration).toContain("Ground claims in the provided case sources.");
  });

  it("keeps rubric and shared-feedback releases independent", () => {
    expect(migration).toContain("release_rubric_to_students BOOLEAN");
    expect(migration).toContain("release_feedback_to_students BOOLEAN");
  });

  it("course-scopes source review and persists citations through S99", () => {
    expect(migration).toContain("assignment.case_id = case_sources.case_id");
    expect(migration).toContain("public.is_caseflow_course_faculty(assignment.course_id)");
    expect(migration).toContain("student_responses_sync_source_ids");
    expect(migration).toContain("S(?:[1-9]|[1-9][0-9])");
  });
});
