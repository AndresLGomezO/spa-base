import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import { z } from "zod";

export const ENTITY_UI_OVERRIDES_COLLECTION = "entity_ui_overrides";

const wizardStepConfigSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    subtitle: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    layout: uiLayoutDocumentSchema,
  })
  .strict();

const wizardFormConfigSchema = z
  .object({
    shellLayout: uiLayoutDocumentSchema,
    steps: z.array(wizardStepConfigSchema).min(1),
  })
  .strict();

const uiOverrideFormsSchema = z
  .object({
    presentation: z.enum(["plain", "wizard"]).optional(),
    layout: uiLayoutDocumentSchema.optional(),
    wizard: wizardFormConfigSchema.optional(),
    modalSize: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
    create: uiLayoutDocumentSchema.optional(),
    edit: uiLayoutDocumentSchema.optional(),
  })
  .strict();

export const entityUiOverrideRecordSchema = z
  .object({
    entityName: z.string().trim().min(1),
    views: z.array(z.unknown()).min(1),
    listViewType: z
      .enum(["table", "card", "expandableTable", "compact"])
      .optional(),
    listItem: uiLayoutDocumentSchema.optional(),
    mainPage: uiLayoutDocumentSchema.optional(),
    recordDetail: uiLayoutDocumentSchema.optional(),
    /** @deprecated Use recordDetail; read-only alias for migration */
    detail: uiLayoutDocumentSchema.optional(),
    forms: uiOverrideFormsSchema.optional(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type EntityUiOverrideRecord = z.infer<
  typeof entityUiOverrideRecordSchema
>;

export const putEntityUiOverrideInputSchema = z
  .object({
    views: z.array(z.unknown()).min(1),
    listViewType: z
      .enum(["table", "card", "expandableTable", "compact"])
      .optional(),
    listItem: uiLayoutDocumentSchema.optional(),
    mainPage: uiLayoutDocumentSchema.optional(),
    recordDetail: uiLayoutDocumentSchema.optional(),
    forms: uiOverrideFormsSchema.optional(),
  })
  .strict();

export type PutEntityUiOverrideInput = z.infer<
  typeof putEntityUiOverrideInputSchema
>;

function toRecordInput(
  entityName: string,
  data: unknown,
): Record<string, unknown> {
  return {
    entityName,
    ...(typeof data === "object" && data !== null ? data : {}),
  };
}

export function parseEntityUiOverrideRecord(
  entityName: string,
  data: unknown,
): EntityUiOverrideRecord {
  return entityUiOverrideRecordSchema.parse(
    toRecordInput(entityName, data),
  ) as EntityUiOverrideRecord;
}

/** Returns null when Firestore data no longer matches the current schema. */
export function safeParseEntityUiOverrideRecord(
  entityName: string,
  data: unknown,
): EntityUiOverrideRecord | null {
  const parsed = entityUiOverrideRecordSchema.safeParse(
    toRecordInput(entityName, data),
  );
  return parsed.success ? (parsed.data as EntityUiOverrideRecord) : null;
}
