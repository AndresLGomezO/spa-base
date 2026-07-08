import { z } from "zod";

export const designLayoutSurfaceSchema = z.enum([
  "list",
  "forms",
  "mainPage",
  "recordDetail",
  "metricsRowDesigner",
]);

export type DesignLayoutSurfaceInput = z.infer<
  typeof designLayoutSurfaceSchema
>;

export const listViewTypeSchema = z.enum(["card", "expandableTable"]);

export const formPresentationSchema = z.enum(["plain", "wizard"]);

export const uiBuilderOutputModeSchema = z.enum(["structure", "render"]);

export type UiBuilderOutputMode = z.infer<typeof uiBuilderOutputModeSchema>;

export const aiUiBuilderInputSchema = z.object({
  question: z.string().trim().min(1).max(8000),
  entityName: z.string().trim().min(1),
  surface: designLayoutSurfaceSchema,
  listViewType: listViewTypeSchema.optional(),
  formPresentation: formPresentationSchema.optional(),
  presentationHint: formPresentationSchema.optional(),
  allowCreative: z.boolean().optional(),
  currentLayoutJson: z.string().max(50000).optional(),
  outputMode: uiBuilderOutputModeSchema.optional().default("structure"),
  parentSuggestionId: z.string().trim().min(1).optional(),
  modificationRequest: z.string().trim().max(8000).optional(),
});

export type AiUiBuilderInput = z.infer<typeof aiUiBuilderInputSchema>;

export const submitAiUiBuilderRequestSchema = aiUiBuilderInputSchema;

export type SubmitAiUiBuilderRequest = z.infer<
  typeof submitAiUiBuilderRequestSchema
>;

export const aiUiBuilderOutputSchema = z.object({
  answer: z.string().trim().min(1),
});

export type AiUiBuilderOutput = z.infer<typeof aiUiBuilderOutputSchema>;

export const processAiUiBuilderTaskPayloadSchema = z.object({
  jobId: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
});

export type ProcessAiUiBuilderTaskPayload = z.infer<
  typeof processAiUiBuilderTaskPayloadSchema
>;
