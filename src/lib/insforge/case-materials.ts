import "server-only";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

import { caseStudy, type CaseSource } from "@/lib/data";
import { isInsForgePersistenceEnabled } from "./config";
import { requireCaseFlowRole } from "./server";

const sourceRowSchema = z.object({
  source_key: z.string().regex(/^S\d{1,2}$/),
  title: z.string().trim().min(1).max(160),
  source_type: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(250_000),
}).strict();

export async function loadStudentCaseSources(): Promise<CaseSource[]> {
  await requireCaseFlowRole("student");
  if (!isInsForgePersistenceEnabled()) return caseStudy.sources;
  const client = createServerClient({ cookies: await cookies() });
  const { data, error } = await client.database
    .from("case_sources")
    .select("source_key, title, source_type, content")
    .eq("case_id", "10000000-0000-0000-0000-000000000001")
    .order("source_key", { ascending: true });
  if (error) throw new Error(`Could not load approved case sources: ${error.message}`);
  return z.array(sourceRowSchema).parse(data).map((source) => ({
    id: source.source_key,
    title: source.title,
    type: source.source_type,
    text: source.content,
  }));
}
