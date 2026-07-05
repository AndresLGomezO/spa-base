import { z } from "zod";

export const UI_BUILDER_PRESETS_COLLECTION = "ui_builder_presets";

export const uiBuilderPresetKindSchema = z.enum([
  "layout-document",
  "column",
  "grid-track",
  "component-row",
]);

export const uiBuilderPresetCategorySchema = z.enum([
  "layout-preset",
  "component-template",
]);

export const uiBuilderFieldSlotKindSchema = z.enum([
  "dataSourceField",
  "formFieldPath",
]);

export const uiBuilderFieldSlotSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: uiBuilderFieldSlotKindSchema,
    label: z.string().trim().min(1).optional(),
    jsonPath: z.string().trim().min(1),
    sourceHint: z.string().trim().min(1).optional(),
  })
  .strict();

export const designSurfaceSchema = z.enum([
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
  "metricWidget",
  "dashboardSection",
  "dashboardLayout",
]);

export const uiBuilderPresetRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    kind: uiBuilderPresetKindSchema,
    presetCategory: uiBuilderPresetCategorySchema.optional(),
    designSurface: designSurfaceSchema.optional(),
    sourceEntityName: z.string().trim().min(1).optional(),
    templateJson: z.string().min(2),
    fieldSlots: z.array(uiBuilderFieldSlotSchema),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const category =
      value.presetCategory ??
      (value.fieldSlots.length === 0 ? "layout-preset" : "component-template");

    if (category === "layout-preset" && value.fieldSlots.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "layout-preset must not include fieldSlots",
        path: ["fieldSlots"],
      });
    }
  });

export const createUiBuilderPresetInputSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    kind: uiBuilderPresetKindSchema,
    presetCategory: uiBuilderPresetCategorySchema.optional(),
    designSurface: designSurfaceSchema.optional(),
    sourceEntityName: z.string().trim().min(1).optional(),
    templateJson: z.string().min(2),
    fieldSlots: z.array(uiBuilderFieldSlotSchema),
  })
  .strict();

export const updateUiBuilderPresetInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    kind: uiBuilderPresetKindSchema.optional(),
    presetCategory: uiBuilderPresetCategorySchema.optional(),
    designSurface: designSurfaceSchema.optional(),
    sourceEntityName: z.string().trim().min(1).optional(),
    templateJson: z.string().min(2).optional(),
    fieldSlots: z.array(uiBuilderFieldSlotSchema).optional(),
  })
  .strict();

export type UiBuilderPresetKind = z.infer<typeof uiBuilderPresetKindSchema>;
export type UiBuilderPresetCategory = z.infer<
  typeof uiBuilderPresetCategorySchema
>;
export type UiBuilderFieldSlotKind = z.infer<
  typeof uiBuilderFieldSlotKindSchema
>;
export type UiBuilderFieldSlot = z.infer<typeof uiBuilderFieldSlotSchema>;
export type DesignSurface = z.infer<typeof designSurfaceSchema>;
export type UiBuilderPresetRecord = z.infer<typeof uiBuilderPresetRecordSchema>;
export type CreateUiBuilderPresetInput = z.infer<
  typeof createUiBuilderPresetInputSchema
>;
export type UpdateUiBuilderPresetInput = z.infer<
  typeof updateUiBuilderPresetInputSchema
>;
