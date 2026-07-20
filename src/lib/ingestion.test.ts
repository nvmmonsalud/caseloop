import { describe, expect, it } from "vitest";

import {
  DocumentIngestionError,
  buildCitationChunks,
  inspectDocument,
  normalizeExtractedText,
} from "./ingestion";

const pdfHeader = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n");
const docxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

describe("secure case-material ingestion", () => {
  it("accepts a small PDF only when its extension, MIME type, and magic bytes agree", () => {
    expect(inspectDocument({ name: "case.pdf", type: "application/pdf", bytes: pdfHeader })).toMatchObject({
      kind: "pdf",
      mimeType: "application/pdf",
    });
    expect(() => inspectDocument({ name: "case.docx", type: "application/pdf", bytes: pdfHeader })).toThrow(
      DocumentIngestionError,
    );
  });

  it("accepts DOCX zip magic and rejects macro-enabled or executable-looking names", () => {
    expect(
      inspectDocument({
        name: "case.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        bytes: docxHeader,
      }),
    ).toMatchObject({ kind: "docx" });
    expect(() =>
      inspectDocument({ name: "case.docm", type: "application/octet-stream", bytes: docxHeader }),
    ).toThrow(/PDF and DOCX/);
    expect(() =>
      inspectDocument({ name: "case.pdf.exe", type: "application/pdf", bytes: pdfHeader }),
    ).toThrow(/PDF and DOCX/);
  });

  it("quarantines known malware signatures and active PDF actions", () => {
    const eicar = Buffer.from("%PDF-1.7 X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const activePdf = Buffer.from("%PDF-1.7\n/JavaScript /OpenAction");
    expect(() => inspectDocument({ name: "bad.pdf", type: "application/pdf", bytes: eicar })).toThrow(
      /malware test signature/,
    );
    expect(() => inspectDocument({ name: "active.pdf", type: "application/pdf", bytes: activePdf })).toThrow(
      /active PDF content/,
    );
  });

  it("normalizes extracted text and creates stable bounded citation chunks", () => {
    const text = normalizeExtractedText("  Market growth\r\n\r\n  is 8%. \u0000\nDistribution is fragmented.  ");
    expect(text).toBe("Market growth\n\nis 8%.\nDistribution is fragmented.");
    expect(buildCitationChunks(text, "S6", 30)).toEqual([
      { id: "S6.1", text: "Market growth\n\nis 8%." },
      { id: "S6.2", text: "Distribution is fragmented." },
    ]);
  });
});
