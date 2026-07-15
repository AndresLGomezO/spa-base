import {
  toPersistedUiBuilderPreset,
  uiBuilderPresetRecordSchema,
  UI_BUILDER_PRESETS_COLLECTION,
  type UiBuilderPresetRecord,
} from "@repo/entities";
import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { TENANTS_COLLECTION } from "@repo/shared-types";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import { z } from "zod";

import { loadUiBuilderPresetsCatalogJson } from "./seed-catalog-dir.js";

const uiBuilderPresetsCatalogSchema = z
  .object({
    kind: z.literal("ui-builder-presets-catalog"),
    version: z.literal(1),
    description: z.string().optional(),
    presets: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            name: z.string().trim().min(1),
            description: z.string().trim().min(1).optional(),
            kind: z.literal("layout-document"),
            presetCategory: z.literal("layout-preset"),
            designSurface: z.literal("metricWidget"),
            sourceEntityName: z.string().trim().min(1),
            templateJson: z.string().trim().min(1),
            fieldSlots: z.array(z.never()).length(0),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export function parseRatesUiBuilderPresetsCatalog(
  jsonText: string,
): z.infer<typeof uiBuilderPresetsCatalogSchema> {
  const parsed = uiBuilderPresetsCatalogSchema.parse(JSON.parse(jsonText));
  for (const preset of parsed.presets) {
    uiLayoutDocumentSchema.parse(JSON.parse(preset.templateJson));
  }
  return parsed;
}

function toPresetRecord(
  catalogPreset: z.infer<
    typeof uiBuilderPresetsCatalogSchema
  >["presets"][number],
): UiBuilderPresetRecord {
  return uiBuilderPresetRecordSchema.parse({
    id: catalogPreset.id,
    name: catalogPreset.name,
    ...(catalogPreset.description
      ? { description: catalogPreset.description }
      : {}),
    kind: catalogPreset.kind,
    presetCategory: catalogPreset.presetCategory,
    designSurface: catalogPreset.designSurface,
    sourceEntityName: catalogPreset.sourceEntityName,
    templateJson: catalogPreset.templateJson,
    fieldSlots: [],
    updatedAt: new Date().toISOString(),
  });
}

export async function seedRatesUiBuilderPresets(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<{ readonly seeded: number }> {
  const catalog = parseRatesUiBuilderPresetsCatalog(
    loadUiBuilderPresetsCatalogJson(),
  );
  const collection = getFirestoreAdmin(firebaseAdminConfig)
    .collection(TENANTS_COLLECTION)
    .doc(tenantId)
    .collection(UI_BUILDER_PRESETS_COLLECTION);

  let seeded = 0;
  for (const catalogPreset of catalog.presets) {
    const record = toPresetRecord(catalogPreset);
    await collection.doc(record.id).set(toPersistedUiBuilderPreset(record));
    seeded += 1;
    console.log(`[seed]   ui builder preset: ${record.name} (${record.id})`);
  }

  return { seeded };
}
