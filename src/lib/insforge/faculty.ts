import "server-only";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

import {
  getAuthorizedFacultyCohortSummary,
  getDemoFacultyCohortSummary,
} from "@/lib/faculty-analytics";
import { INSFORGE_ASSIGNMENT_ID, isInsForgePersistenceEnabled } from "./config";
import { requireCaseFlowRole } from "./server";

export async function loadFacultyCohortSummary() {
  const session = await requireCaseFlowRole("faculty");
  if (!isInsForgePersistenceEnabled()) return getDemoFacultyCohortSummary();

  const client = createServerClient({ cookies: await cookies() });
  return getAuthorizedFacultyCohortSummary({
    role: session?.role ?? "student",
    rpc: async () => {
      const { data, error } = await client.database.rpc("get_caseflow_cohort_summary", {
        target_assignment: INSFORGE_ASSIGNMENT_ID,
      });
      return {
        data,
        error: error ? { message: error.message } : null,
      };
    },
  });
}
