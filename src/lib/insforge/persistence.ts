import { attemptSchema, type AttemptDraft } from "@/lib/attempt";
import { z } from "zod";
import { getInsForgeBrowserClient } from "./client";
import { isInsForgePersistenceEnabled } from "./config";

const persistedAttemptSchema = attemptSchema.extend({
  attemptId: z.string().uuid(),
  status: z.enum(["in_progress", "completed"]),
  brief: z.unknown().nullable().optional(),
  reflection: z.string().nullable().optional(),
  comparison: z.unknown().nullable().optional(),
});

export type PersistedAttempt = z.infer<typeof persistedAttemptSchema>;

function rpcError(error: { message?: string } | null, fallback: string) {
  return new Error(error?.message || fallback);
}

export async function loadPersistedAttempt(): Promise<PersistedAttempt | null> {
  if (!isInsForgePersistenceEnabled()) return null;

  const client = getInsForgeBrowserClient();
  const { data, error } = await client.database.rpc("load_caseflow_attempt");
  if (error) throw rpcError(error, "Could not load your saved preparation.");
  if (!data) return null;

  const parsed = persistedAttemptSchema.safeParse(data);
  if (!parsed.success) throw new Error("Your saved preparation has an unsupported format.");
  return parsed.data;
}

export async function savePersistedAttempt(
  attempt: AttemptDraft,
  stage: "draft" | "completed" = "draft",
) {
  if (!isInsForgePersistenceEnabled()) return null;

  const validated = attemptSchema.parse(attempt);
  const client = getInsForgeBrowserClient();
  const { data, error } = await client.database.rpc("save_caseflow_attempt", {
    payload: validated,
    stage,
  });
  if (error) throw rpcError(error, "Could not save your preparation.");
  return data;
}

export async function savePersistedBrief(brief: unknown) {
  if (!isInsForgePersistenceEnabled()) return null;
  const client = getInsForgeBrowserClient();
  const { data, error } = await client.database.rpc("save_caseflow_brief", {
    brief_payload: brief,
  });
  if (error) throw rpcError(error, "Could not save your preparation brief.");
  return data;
}

export async function savePersistedReflection(reflection: string, comparison: unknown) {
  if (!isInsForgePersistenceEnabled()) return null;
  const client = getInsForgeBrowserClient();
  const { data, error } = await client.database.rpc("save_caseflow_reflection", {
    reflection_text: reflection,
    comparison_payload: comparison,
  });
  if (error) throw rpcError(error, "Could not save your reflection.");
  return data;
}
