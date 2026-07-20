import { createHash } from "node:crypto";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_CASE_MATERIAL_BYTES = 4 * 1024 * 1024;
export const MAX_EXTRACTED_TEXT_CHARACTERS = 250_000;

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export class DocumentIngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentIngestionError";
  }
}

export type InspectedDocument = {
  kind: "pdf" | "docx";
  mimeType: typeof PDF_MIME | typeof DOCX_MIME;
  safeFilename: string;
  sizeBytes: number;
  sha256: string;
};

function safeFilename(name: string) {
  const base = name.split(/[\\/]/).pop()?.normalize("NFKC") ?? "";
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._()-]{0,119}\.(pdf|docx)$/iu.test(base)) {
    throw new DocumentIngestionError("Only PDF and DOCX filenames are accepted.");
  }
  return base.replace(/\s+/g, " ");
}

export function inspectDocument({ name, type, bytes }: { name: string; type: string; bytes: Uint8Array }) {
  if (bytes.byteLength === 0) throw new DocumentIngestionError("The selected document is empty.");
  if (bytes.byteLength > MAX_CASE_MATERIAL_BYTES) {
    throw new DocumentIngestionError("Case materials must be 4 MB or smaller.");
  }

  const filename = safeFilename(name);
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  const expectedMime = isPdf ? PDF_MIME : DOCX_MIME;
  if (type !== expectedMime) throw new DocumentIngestionError("The browser MIME type does not match the file extension.");

  const hasPdfMagic = bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-";
  const hasZipMagic =
    bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
  if ((isPdf && !hasPdfMagic) || (!isPdf && !hasZipMagic)) {
    throw new DocumentIngestionError("The document signature does not match its declared type.");
  }

  const binaryText = Buffer.from(bytes).toString("latin1");
  if (binaryText.includes(EICAR_SIGNATURE)) {
    throw new DocumentIngestionError("The document matched a malware test signature and was quarantined.");
  }
  if (isPdf && /\/(JavaScript|JS|OpenAction|Launch|EmbeddedFile)\b/i.test(binaryText)) {
    throw new DocumentIngestionError("The document contains active PDF content and was quarantined.");
  }
  if (!isPdf && /vbaProject\.bin|macros\//i.test(binaryText)) {
    throw new DocumentIngestionError("Macro-enabled Office documents are not accepted.");
  }

  return {
    kind: isPdf ? "pdf" : "docx",
    mimeType: expectedMime,
    safeFilename: filename,
    sizeBytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  } satisfies InspectedDocument;
}

export function normalizeExtractedText(value: string) {
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/[\t ]+/g, " "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalized.length < 40) throw new DocumentIngestionError("The document did not contain enough extractable text.");
  if (normalized.length > MAX_EXTRACTED_TEXT_CHARACTERS) {
    throw new DocumentIngestionError("The extracted document text exceeds the 250,000-character limit.");
  }
  return normalized;
}

export async function extractDocumentText(bytes: Uint8Array, kind: InspectedDocument["kind"]) {
  if (kind === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    if (result.totalPages > 150) throw new DocumentIngestionError("PDF case materials may contain at most 150 pages.");
    return normalizeExtractedText(result.text);
  }
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  if (result.messages.some((message) => message.type === "error")) {
    throw new DocumentIngestionError("The DOCX parser reported an unsafe or unreadable document.");
  }
  return normalizeExtractedText(result.value);
}

export function buildCitationChunks(text: string, sourceKey: string, maxCharacters = 1_600) {
  if (!/^S\d{1,2}$/.test(sourceKey)) throw new DocumentIngestionError("Citation source keys must use the S-number format.");
  const chunks: Array<{ id: string; text: string }> = [];
  let current = "";
  let separator = "";
  for (const paragraph of text.split(/(\n+)/).filter(Boolean)) {
    if (/^\n+$/.test(paragraph)) {
      separator = paragraph.length > 1 ? "\n\n" : "\n";
      continue;
    }
    if (paragraph.length > maxCharacters) {
      if (current) chunks.push({ id: `${sourceKey}.${chunks.length + 1}`, text: current });
      current = "";
      for (let start = 0; start < paragraph.length; start += maxCharacters) {
        chunks.push({ id: `${sourceKey}.${chunks.length + 1}`, text: paragraph.slice(start, start + maxCharacters) });
      }
      continue;
    }
    const candidate = current ? `${current}${separator}${paragraph}` : paragraph;
    if (candidate.length > maxCharacters && current) {
      chunks.push({ id: `${sourceKey}.${chunks.length + 1}`, text: current });
      current = paragraph;
    } else current = candidate;
    separator = "";
  }
  if (current) chunks.push({ id: `${sourceKey}.${chunks.length + 1}`, text: current });
  return chunks;
}
