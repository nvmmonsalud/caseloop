import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildCitationChunks,
  DocumentIngestionError,
  extractDocumentText,
  inspectDocument,
  MAX_CASE_MATERIAL_BYTES,
} from "@/lib/ingestion";
import { getCaseFlowSession } from "@/lib/insforge/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const courseId = "30000000-0000-0000-0000-000000000001";
const caseId = "20000000-0000-0000-0000-000000000001";
const titleSchema = z.string().trim().min(2).max(160);

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin uploads are not accepted." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_CASE_MATERIAL_BYTES + 100_000) {
    return NextResponse.json({ error: "Case materials must be 4 MB or smaller." }, { status: 413 });
  }

  const session = await getCaseFlowSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (session.role !== "faculty") return NextResponse.json({ error: "Faculty access required." }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = titleSchema.parse(formData.get("title"));
    if (!(file instanceof File)) throw new DocumentIngestionError("Select a PDF or DOCX document.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectDocument({ name: file.name, type: file.type, bytes });
    const extractedText = await extractDocumentText(bytes, inspected.kind);

    const client = createServerClient({ cookies: await cookies() });
    const extension = inspected.kind;
    const storageKey = `${courseId}/${caseId}/${crypto.randomUUID()}.${extension}`;
    const uploadFile = new File([bytes], inspected.safeFilename, { type: inspected.mimeType });
    const { data: stored, error: storageError } = await client.storage.from("case-materials").upload(storageKey, uploadFile);
    if (storageError || !stored?.url || !stored?.key) throw new Error("Private storage upload failed.");

    const { data: registered, error: registerError } = await client.database.rpc("register_caseflow_source", {
      source_title: title,
      source_content: extractedText,
      source_mime_type: inspected.mimeType,
      source_storage_url: stored.url,
      source_storage_key: stored.key,
      source_original_filename: inspected.safeFilename,
      source_size_bytes: inspected.sizeBytes,
      source_sha256: inspected.sha256,
    });
    if (registerError || !registered || typeof registered !== "object") {
      await client.storage.from("case-materials").remove(stored.key);
      throw new Error("Validated source registration failed.");
    }

    const parsed = z.object({ id: z.uuid(), sourceKey: z.string().regex(/^S\d{1,2}$/), reviewStatus: z.literal("pending") }).strict().parse(registered);
    return NextResponse.json({
      source: parsed,
      filename: inspected.safeFilename,
      sizeBytes: inspected.sizeBytes,
      sha256: inspected.sha256,
      preview: extractedText.slice(0, 800),
      citationChunks: buildCitationChunks(extractedText, parsed.sourceKey).slice(0, 5),
      message: "Validated and quarantined. Faculty approval is required before students can access this source.",
    });
  } catch (error) {
    const message = error instanceof DocumentIngestionError || error instanceof z.ZodError
      ? error instanceof z.ZodError ? error.issues[0]?.message : error.message
      : "The document could not be ingested safely.";
    return NextResponse.json({ error: message }, { status: error instanceof DocumentIngestionError || error instanceof z.ZodError ? 400 : 500 });
  }
}
