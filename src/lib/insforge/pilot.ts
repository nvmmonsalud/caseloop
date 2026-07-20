import "server-only";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

import { defaultPilotSettings, parsePilotSettings } from "@/lib/pilot-settings";
import { isInsForgePersistenceEnabled } from "./config";
import { requireCaseFlowRole } from "./server";

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
