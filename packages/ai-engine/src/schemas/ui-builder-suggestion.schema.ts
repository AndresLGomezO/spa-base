import { z } from "zod";

import {
  designLayoutSurfaceSchema,
  listViewTypeSchema,
} from "./ai-ui-builder.schema.js";

export const UI_BUILDER_AI_SUGGESTIONS_COLLECTION = "ui_builder_ai_suggestions";

export const uiBuilderSuggestionStatusSchema = z.enum(["ready", "failed"]);

export type UiBuilderSuggestionStatus = z.infer<
  typeof uiBuilderSuggestionStatusSchema
>;

export const uiBuilderSuggestionValidationErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type UiBuilderSuggestionValidationError = z.infer<
  typeof uiBuilderSuggestionValidationErrorSchema
>;

/** Persisted list slice payload (validated at write time). */
export const uiBuilderSuggestionSliceDataSchema = z.record(
  z.string(),
  z.unknown(),
);

export const uiBuilderSuggestionRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  entityName: z.string().trim().min(1),
  surface: designLayoutSurfaceSchema,
  listViewType: listViewTypeSchema.optional(),
  jobId: z.string().trim().min(1),
  status: uiBuilderSuggestionStatusSchema,
  userContext: z.string().optional(),
  sliceData: uiBuilderSuggestionSliceDataSchema.optional(),
  validationErrors: z
    .array(uiBuilderSuggestionValidationErrorSchema)
    .optional(),
  rawAnswer: z.string().optional(),
  createdBy: z.string().trim().min(1),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type UiBuilderSuggestionRecord = z.infer<
  typeof uiBuilderSuggestionRecordSchema
>;

export const createUiBuilderSuggestionInputSchema = z.object({
  entityName: z.string().trim().min(1),
  surface: designLayoutSurfaceSchema,
  jobId: z.string().trim().min(1),
  status: uiBuilderSuggestionStatusSchema,
  userContext: z.string().optional(),
  sliceData: uiBuilderSuggestionSliceDataSchema.optional(),
  validationErrors: z
    .array(uiBuilderSuggestionValidationErrorSchema)
    .optional(),
  rawAnswer: z.string().optional(),
  listViewType: listViewTypeSchema.optional(),
  createdBy: z.string().trim().min(1),
});

export type CreateUiBuilderSuggestionInput = z.infer<
  typeof createUiBuilderSuggestionInputSchema
>;
