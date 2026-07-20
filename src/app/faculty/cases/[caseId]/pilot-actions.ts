"use server";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pilotSettingsSchema } from "@/lib/pilot-settings";
import { requireCaseFlowRole } from "@/lib/insforge/server";

export type PilotSettingsActionState = { message?: string; error?: string };

const submissionSchema = z.object({
  rubric: z.string().max(12_000).transform((value, context) => {
    try { return JSON.parse(value); } catch {
      context.addIssue({ code: "custom", message: "The rubric could not be parsed." });
      return z.NEVER;
    }
  }),
  feedbackTitle: z.string().trim().min(2).max(120),
  feedbackBody: z.string().trim().min(1).max(4_000),
  release: z.boolean(),
});

export async function savePilotSettingsAction(
  _state: PilotSettingsActionState,
  formData: FormData,
): Promise<PilotSettingsActionState> {
  await requireCaseFlowRole("faculty");
  const submission = submissionSchema.safeParse({
    rubric: formData.get("rubric"),
    feedbackTitle: formData.get("feedbackTitle"),
    feedbackBody: formData.get("feedbackBody"),
    release: formData.get("release") === "on",
  });
  if (!submission.success) return { error: submission.error.issues[0]?.message ?? "Review the assignment settings." };
  const settings = pilotSettingsSchema.safeParse({ rubric: submission.data.rubric });
  if (!settings.success) return { error: settings.error.issues[0]?.message ?? "Review the rubric criteria." };

  const client = createServerClient({ cookies: await cookies() });
  const { error } = await client.database.rpc("save_caseflow_assignment_pilot_settings", {
    rubric_payload: settings.data.rubric,
    feedback_title: submission.data.feedbackTitle,
    feedback_body: submission.data.feedbackBody,
    release_to_students: submission.data.release,
  });
  if (error) return { error: "The assignment controls could not be saved. No changes were released." };
  revalidatePath("/faculty/cases/[caseId]", "page");
  revalidatePath("/student");
  return { message: submission.data.release ? "Rubric and shared feedback released to students." : "Draft saved for faculty only." };
}

export async function reviewCaseSourceAction(sourceId: string, approve: boolean) {
  await requireCaseFlowRole("faculty");
  const parsed = z.uuid().safeParse(sourceId);
  if (!parsed.success) return { error: "Invalid source identifier." };
  const client = createServerClient({ cookies: await cookies() });
  const { error } = await client.database.rpc("review_caseflow_source", {
    source_id_input: parsed.data,
    approve,
  });
  if (error) return { error: "The source review could not be saved." };
  revalidatePath("/faculty/cases/[caseId]", "page");
  return { message: approve ? "Source approved for student use." : "Source rejected and kept unavailable." };
}
