import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import { z } from "zod";

export const ENTITY_UI_OVERRIDES_COLLECTION = "entity_ui_overrides";

const uiOverrideFormsSchema = z
  .object({
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
