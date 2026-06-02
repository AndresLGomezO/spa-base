import { z } from "zod";

export const ENTITY_UI_OVERRIDES_COLLECTION = "entity_ui_overrides";

export const entityUiOverrideRecordSchema = z
  .object({
    entityName: z.string().trim().min(1),
    views: z.array(z.unknown()).min(1),
    listViewType: z.enum(["table", "card"]).optional(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type EntityUiOverrideRecord = z.infer<
  typeof entityUiOverrideRecordSchema
>;

export const putEntityUiOverrideInputSchema = z
  .object({
    views: z.array(z.unknown()).min(1),
    listViewType: z.enum(["table", "card"]).optional(),
  })
  .strict();

export type PutEntityUiOverrideInput = z.infer<
  typeof putEntityUiOverrideInputSchema
>;
