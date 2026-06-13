import { z } from "zod";

import {
  columnNodeSchema,
  componentRowSchema,
  nestedLayoutRowSchema,
  uiLayoutDocumentSchema,
} from "@repo/ui-builder-core";

import {
  uiBuilderPresetRecordSchema,
  type UiBuilderPresetKind,
  type UiBuilderPresetRecord,
} from "./ui-builder-preset-schema.js";

export const persistedUiBuilderPresetSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    kind: z.enum([
      "layout-document",
      "column",
      "component-row",
      "nested-layout-row",
    ]),
    designSurface: z
      .enum([
        "listItem",
        "tableColumnCell",
        "tableRowExpand",
        "mainPage",
        "recordDetail",
        "formCreate",
        "formEdit",
        "formPlain",
        "formWizardShell",
        "formWizardStep",
        "formModalFooter",
        "metricStrip",
        "metricRow",
      ])
      .optional(),
    sourceEntityName: z.string().trim().min(1).optional(),
    templateJson: z.string().min(2),
    fieldSlotsJson: z.string().min(2),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type PersistedUiBuilderPreset = z.infer<
  typeof persistedUiBuilderPresetSchema
>;

function parseJsonField<T>(json: string, fieldName: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(
      `Invalid JSON in persisted UI builder preset "${fieldName}".`,
    );
  }
}

function validateTemplateJson(
  kind: UiBuilderPresetKind,
  templateJson: string,
): void {
  const parsed = parseJsonField<unknown>(templateJson, "templateJson");
  switch (kind) {
    case "layout-document":
      uiLayoutDocumentSchema.parse(parsed);
      return;
    case "column":
      columnNodeSchema.parse(parsed);
      return;
    case "component-row":
      componentRowSchema.parse(parsed);
      return;
    case "nested-layout-row":
      nestedLayoutRowSchema.parse(parsed);
      return;
  }
}

export function toPersistedUiBuilderPreset(
  record: UiBuilderPresetRecord,
): PersistedUiBuilderPreset {
  validateTemplateJson(record.kind, record.templateJson);
  return persistedUiBuilderPresetSchema.parse({
    name: record.name,
    ...(record.description ? { description: record.description } : {}),
    kind: record.kind,
    ...(record.designSurface ? { designSurface: record.designSurface } : {}),
    ...(record.sourceEntityName
      ? { sourceEntityName: record.sourceEntityName }
      : {}),
    templateJson: record.templateJson,
    fieldSlotsJson: JSON.stringify(record.fieldSlots),
    updatedAt: record.updatedAt,
  });
}

export function fromPersistedUiBuilderPreset(
  id: string,
  data: PersistedUiBuilderPreset,
): UiBuilderPresetRecord {
  return uiBuilderPresetRecordSchema.parse({
    id,
    name: data.name,
    ...(data.description ? { description: data.description } : {}),
    kind: data.kind,
    ...(data.designSurface ? { designSurface: data.designSurface } : {}),
    ...(data.sourceEntityName
      ? { sourceEntityName: data.sourceEntityName }
      : {}),
    templateJson: data.templateJson,
    fieldSlots: parseJsonField(data.fieldSlotsJson, "fieldSlotsJson"),
    updatedAt: data.updatedAt,
  });
}

export function safeFromPersistedUiBuilderPreset(
  id: string,
  data: unknown,
): UiBuilderPresetRecord | null {
  const parsed = persistedUiBuilderPresetSchema.safeParse(data);
  if (!parsed.success) {
    return null;
  }
  try {
    return fromPersistedUiBuilderPreset(id, parsed.data);
  } catch {
    return null;
  }
}
