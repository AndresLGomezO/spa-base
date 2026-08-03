import { z } from "zod";

import {
  createDocumentExtractionTemplateInputSchema,
  DOCUMENT_EXTRACTION_TEMPLATE_DEFINITION_JSON_KIND,
  DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION,
  DOCUMENT_EXTRACTION_TEMPLATES_CATALOG_JSON_KIND,
  type CreateDocumentExtractionTemplateInput,
  type DocumentExtractionTemplateRecord,
} from "./document-extraction-template.schema.js";

export interface DocumentExtractionTemplateJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly DocumentExtractionTemplateJsonError[];
    };

const portableDocumentExtractionTemplateSchema =
  createDocumentExtractionTemplateInputSchema;

export type PortableDocumentExtractionTemplate = z.infer<
  typeof portableDocumentExtractionTemplateSchema
>;

const documentExtractionTemplateEnvelopeSchema = z.object({
  kind: z.literal(DOCUMENT_EXTRACTION_TEMPLATE_DEFINITION_JSON_KIND),
  version: z.literal(DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION),
  data: portableDocumentExtractionTemplateSchema,
});

export type DocumentExtractionTemplateFormData = z.infer<
  typeof documentExtractionTemplateEnvelopeSchema
>["data"];

export const documentExtractionTemplatesCatalogEnvelopeSchema = z.object({
  kind: z.literal(DOCUMENT_EXTRACTION_TEMPLATES_CATALOG_JSON_KIND),
  version: z.literal(DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION),
  exportedAt: z.string().datetime(),
  documentExtractionTemplates: z
    .array(portableDocumentExtractionTemplateSchema)
    .min(1),
});

export type DocumentExtractionTemplatesCatalogEnvelope = z.infer<
  typeof documentExtractionTemplatesCatalogEnvelopeSchema
>;

export interface DocumentExtractionTemplateCatalogReplacePlan {
  readonly toCreate: readonly CreateDocumentExtractionTemplateInput[];
  readonly toUpdate: readonly {
    readonly existing: DocumentExtractionTemplateRecord;
    readonly input: CreateDocumentExtractionTemplateInput;
  }[];
  readonly toDelete: readonly DocumentExtractionTemplateRecord[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly DocumentExtractionTemplateJsonError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "$",
    message: issue.message,
  }));
}

function parseJsonText(text: string): JsonImportResult<unknown> {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Invalid JSON." }],
    };
  }
}

function validateCatalogCrossReferences(
  templates: readonly CreateDocumentExtractionTemplateInput[],
): readonly DocumentExtractionTemplateJsonError[] {
  const errors: DocumentExtractionTemplateJsonError[] = [];
  const idCounts = new Map<string, number>();

  for (const template of templates) {
    idCounts.set(template.id, (idCounts.get(template.id) ?? 0) + 1);
  }

  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({
        path: "documentExtractionTemplates",
        message: `Duplicate document extraction template id "${id}".`,
      });
    }
  }

  return errors;
}

export function toPortableDocumentExtractionTemplate(
  record: DocumentExtractionTemplateRecord,
): CreateDocumentExtractionTemplateInput {
  const {
    tenantId: _tenantId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...portable
  } = record;
  void _tenantId;
  void _createdAt;
  void _updatedAt;
  return createDocumentExtractionTemplateInputSchema.parse(portable);
}

export function createDocumentExtractionTemplateEnvelope(
  data: DocumentExtractionTemplateFormData,
): {
  readonly kind: typeof DOCUMENT_EXTRACTION_TEMPLATE_DEFINITION_JSON_KIND;
  readonly version: typeof DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION;
  readonly data: DocumentExtractionTemplateFormData;
} {
  return {
    kind: DOCUMENT_EXTRACTION_TEMPLATE_DEFINITION_JSON_KIND,
    version: DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION,
    data,
  };
}

export function createDocumentExtractionTemplatesCatalogEnvelope(
  templates: readonly DocumentExtractionTemplateRecord[],
  options?: { readonly exportedAt?: string },
): DocumentExtractionTemplatesCatalogEnvelope {
  return {
    kind: DOCUMENT_EXTRACTION_TEMPLATES_CATALOG_JSON_KIND,
    version: DOCUMENT_EXTRACTION_TEMPLATE_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    documentExtractionTemplates: templates.map(
      toPortableDocumentExtractionTemplate,
    ),
  };
}

export function parseDocumentExtractionTemplateDefinitionJson(
  text: string,
): JsonImportResult<DocumentExtractionTemplateFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = documentExtractionTemplateEnvelopeSchema.safeParse(
    parsed.data,
  );
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function parseDocumentExtractionTemplatesCatalogJson(
  text: string,
): JsonImportResult<DocumentExtractionTemplatesCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = documentExtractionTemplatesCatalogEnvelopeSchema.safeParse(
    parsed.data,
  );
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.documentExtractionTemplates,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateDocumentExtractionTemplatesCatalogEnvelope(
  input: unknown,
): JsonImportResult<DocumentExtractionTemplatesCatalogEnvelope> {
  const result =
    documentExtractionTemplatesCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.documentExtractionTemplates,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeDocumentExtractionTemplateCatalogReplacePlan(input: {
  readonly existing: readonly DocumentExtractionTemplateRecord[];
  readonly imported: readonly CreateDocumentExtractionTemplateInput[];
}): DocumentExtractionTemplateCatalogReplacePlan {
  const existingById = new Map(
    input.existing.map((record) => [record.id, record]),
  );
  const importedById = new Map(
    input.imported.map((record) => [record.id, record]),
  );

  const toCreate: CreateDocumentExtractionTemplateInput[] = [];
  const toUpdate: DocumentExtractionTemplateCatalogReplacePlan["toUpdate"][number][] =
    [];
  const toDelete: DocumentExtractionTemplateRecord[] = [];

  for (const imported of input.imported) {
    const existing = existingById.get(imported.id);
    if (existing) {
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  for (const existing of input.existing) {
    if (!importedById.has(existing.id)) {
      toDelete.push(existing);
    }
  }

  return {
    toCreate,
    toUpdate,
    toDelete,
    counts: {
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    },
  };
}
