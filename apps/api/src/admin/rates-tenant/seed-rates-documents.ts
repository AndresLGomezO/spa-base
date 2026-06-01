import type { EntityFileReference } from "@repo/entities";
import {
  createStableEntityFileObjectId,
  uploadEntityFile,
} from "@repo/gcp-firebase";

import { RATES_TENANT_ID } from "./constants.js";
import type { RatesRecordSeedContext } from "./seed-helpers.js";

/** Minimal valid single-page PDF used as an empty statement placeholder. */
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

export function shouldSeedProductSnapshotStatement(recordId: string): boolean {
  let hash = 0;
  for (const char of recordId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 5 < 2;
}

export async function uploadRatesProductSnapshotStatement(
  context: RatesRecordSeedContext,
  params: {
    readonly recordId: string;
  },
): Promise<EntityFileReference | undefined> {
  try {
    return await uploadEntityFile({
      config: context.config,
      tenantId: RATES_TENANT_ID,
      entityName: "productSnapshot",
      fieldName: "statement",
      fieldType: "document",
      objectId: createStableEntityFileObjectId(
        `rates/productSnapshot/${params.recordId}/statement`,
      ),
      buffer: EMPTY_MOCK_PDF,
      contentType: "application/pdf",
      fileName: "statement.pdf",
      uploadedBy: context.ownerId,
    });
  } catch (error) {
    console.warn(
      `[rates-seed] Failed to upload statement for productSnapshot/${params.recordId}:`,
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
}
