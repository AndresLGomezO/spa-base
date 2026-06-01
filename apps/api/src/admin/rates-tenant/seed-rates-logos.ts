import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { EntityFileReference } from "@repo/entities";
import {
  createStableEntityFileObjectId,
  uploadEntityFile,
} from "@repo/gcp-firebase";

import { RATES_TENANT_ID } from "./constants.js";
import type { RatesRecordSeedContext } from "./seed-helpers.js";

const LOGOS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "assets",
  "logos",
);

export async function uploadRatesEntityLogo(
  context: RatesRecordSeedContext,
  params: {
    readonly entityName: "bank" | "serviceProvider";
    readonly recordId: string;
    readonly assetFileName: string;
  },
): Promise<EntityFileReference | undefined> {
  const assetPath = join(LOGOS_DIR, params.assetFileName);

  let buffer: Buffer;
  try {
    buffer = readFileSync(assetPath);
  } catch {
    console.warn(
      `[rates-seed] Logo asset not found: ${assetPath}. Skipping logo for ${params.recordId}.`,
    );
    return undefined;
  }

  try {
    return await uploadEntityFile({
      config: context.config,
      tenantId: RATES_TENANT_ID,
      entityName: params.entityName,
      fieldName: "logo",
      fieldType: "image",
      objectId: createStableEntityFileObjectId(
        `rates/${params.entityName}/${params.recordId}/logo`,
      ),
      buffer,
      contentType: "image/png",
      fileName: params.assetFileName,
      uploadedBy: context.ownerId,
    });
  } catch (error) {
    console.warn(
      `[rates-seed] Failed to upload logo for ${params.entityName}/${params.recordId}:`,
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
}
