import { z } from "zod";

export const DOCUMENT_EXTRACTION_TEMPLATES_COLLECTION =
  "__document_extraction_templates" as const;

export const DOCUMENT_EXTRACTION_TEMPLATE_DEFINITION_JSON_KIND =
  "document-extraction-template-definition" as const;
export const DOCUMENT_EXTRACTION_TEMPLATES_CATALOG_JSON_KIND =
  "document-extraction-templates-catalog" as const;
export const DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION = 1 as const;

export const documentExtractionMatchHintsSchema = z
  .object({
    financialItem: z
      .object({
        institution: z.string().trim().min(1).optional(),
        itemType: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    account: z
      .object({
        accountType: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type DocumentExtractionMatchHints = z.infer<
  typeof documentExtractionMatchHintsSchema
>;

export const documentExtractionTemplateBodySchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9_-]*$/i, "Template id must be alphanumeric"),
    institution: z.string().trim().min(1).optional(),
    documentType: z.string().trim().min(1),
    matchHints: documentExtractionMatchHintsSchema.optional(),
    extractionInstructions: z.string().min(1).max(32_000),
    schema: z.record(z.string(), z.unknown()),
    dlpAdditionalInfoTypes: z.array(z.string().trim().min(1)).optional(),
    onConfirmHookId: z.string().trim().min(1),
    labels: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type DocumentExtractionTemplateBody = z.infer<
  typeof documentExtractionTemplateBodySchema
>;

export const documentExtractionTemplateRecordSchema =
  documentExtractionTemplateBodySchema
    .extend({
      tenantId: z.string().trim().min(1),
      createdAt: z.string().trim().min(1),
      updatedAt: z.string().trim().min(1),
    })
    .strict();

export type DocumentExtractionTemplateRecord = z.infer<
  typeof documentExtractionTemplateRecordSchema
>;

export const createDocumentExtractionTemplateInputSchema =
  documentExtractionTemplateBodySchema;

export type CreateDocumentExtractionTemplateInput = z.infer<
  typeof createDocumentExtractionTemplateInputSchema
>;

export const patchDocumentExtractionTemplateInputSchema =
  documentExtractionTemplateBodySchema.partial().omit({ id: true }).strict();

export type PatchDocumentExtractionTemplateInput = z.infer<
  typeof patchDocumentExtractionTemplateInputSchema
>;

export const documentExtractionTemplateEnvelopeSchema = z.object({
  kind: z.literal(DOCUMENT_EXTRACTION_TEMPLATE_DEFINITION_JSON_KIND),
  version: z.literal(DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION),
  data: documentExtractionTemplateBodySchema,
});

export type DocumentExtractionTemplateEnvelope = z.infer<
  typeof documentExtractionTemplateEnvelopeSchema
>;

export interface DocumentExtractionTemplateRepository {
  list(tenantId: string): Promise<readonly DocumentExtractionTemplateRecord[]>;
  get(
    tenantId: string,
    id: string,
  ): Promise<DocumentExtractionTemplateRecord | null>;
  create(
    tenantId: string,
    input: CreateDocumentExtractionTemplateInput,
  ): Promise<DocumentExtractionTemplateRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchDocumentExtractionTemplateInput,
  ): Promise<DocumentExtractionTemplateRecord>;
  delete(tenantId: string, id: string): Promise<void>;
}
