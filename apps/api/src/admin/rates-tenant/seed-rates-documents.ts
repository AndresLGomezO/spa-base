import type { EntityFileReference } from "@repo/entities";
import {
  createStableEntityFileObjectId,
  uploadEntityFile,
} from "@repo/gcp-firebase";

import type { RatesRecordSeedContext } from "./seed-record-helpers.js";

/** Minimal valid single-page PDF used as an empty document placeholder. */
const EMPTY_MOCK_PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /MediaBox [0 0 612 792] /Parent 2 0 R >>endobj",
    "xref",
    "0 4",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    "trailer<< /Size 4 /Root 1 0 R >>",
    "startxref",
    "190",
    "%%EOF",
  ].join("\n"),
  "utf-8",
);

export async function uploadRatesEmptyPdf(
  context: RatesRecordSeedContext,
  params: {
    readonly entityName: string;
    readonly fieldName: string;
    readonly recordId: string;
    readonly fileName?: string;
  },
): Promise<EntityFileReference | undefined> {
  try {
    return await uploadEntityFile({
      config: context.config,
      tenantId: context.tenantId,
      entityName: params.entityName,
      fieldName: params.fieldName,
      fieldType: "document",
      objectId: createStableEntityFileObjectId(
        `rates/${params.entityName}/${params.recordId}/${params.fieldName}`,
      ),
      buffer: EMPTY_MOCK_PDF,
      contentType: "application/pdf",
      fileName: params.fileName ?? "document.pdf",
      uploadedBy: context.ownerId,
    });
  } catch (error) {
    console.warn(
      `[rates-seed] Failed to upload ${params.entityName}/${params.recordId}/${params.fieldName}:`,
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
}
