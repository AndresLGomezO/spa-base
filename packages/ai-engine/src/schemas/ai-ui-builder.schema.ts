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

export const listViewTypeSchema = z.enum(["table", "card", "expandableTable"]);

export const formPresentationSchema = z.enum(["plain", "wizard"]);

export const aiUiBuilderInputSchema = z.object({
  question: z.string().trim().min(1).max(8000),
  entityName: z.string().trim().min(1),
  surface: designLayoutSurfaceSchema,
  listViewType: listViewTypeSchema.optional(),
  formPresentation: formPresentationSchema.optional(),
  currentLayoutJson: z.string().max(50000).optional(),
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
