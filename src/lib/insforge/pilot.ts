import "server-only";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

import { defaultPilotSettings, parsePilotSettings } from "@/lib/pilot-settings";
import { isInsForgePersistenceEnabled } from "./config";
import { requireCaseFlowRole } from "./server";

const pendingSourceRowSchema = z.object({
  id: z.uuid(),
  source_key: z.string().regex(/^S\d{1,2}$/),
  original_filename: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(250_000),
  review_status: z.literal("pending"),
}).strict();

export type FacultyPendingSource = {
  id: string;
  sourceKey: string;
  reviewStatus: "pending";
  filename: string;
  preview: string;
};

async function load(role: "student" | "faculty") {
  await requireCaseFlowRole(role);
  if (!isInsForgePersistenceEnabled()) {
    return role === "faculty" ? defaultPilotSettings : { rubric: [], rubricReleasedAt: null, feedback: null };
  }
  const client = createServerClient({ cookies: await cookies() });
  const { data, error } = await client.database.rpc("get_caseflow_assignment_pilot_settings");
  if (error) throw new Error(`Could not load assignment controls: ${error.message}`);
  return parsePilotSettings(data);
}

export const loadFacultyPilotSettings = () => load("faculty");
export const loadStudentPilotSettings = () => load("student");

export async function loadFacultyPendingSources(): Promise<FacultyPendingSource[]> {
  await requireCaseFlowRole("faculty");
  if (!isInsForgePersistenceEnabled()) return [];
  const client = createServerClient({ cookies: await cookies() });
  const { data, error } = await client.database
    .from("case_sources")
    .select("id, source_key, original_filename, content, review_status")
    .eq("case_id", "10000000-0000-0000-0000-000000000001")
    .eq("source_type", "faculty_upload")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load pending case sources: ${error.message}`);
  return z.array(pendingSourceRowSchema).parse(data).map((source) => ({
    id: source.id,
    sourceKey: source.source_key,
    reviewStatus: source.review_status,
    filename: source.original_filename,
    preview: source.content.slice(0, 800),
  }));
}
