import { z } from "zod";

import {
  customViewNavConfigSchema,
  customViewUIConfigSchema,
  CUSTOM_VIEW_STATUSES,
  type CreateCustomViewInput,
  type CustomViewRecord,
} from "./types.js";

export const CUSTOM_VIEW_DEFINITION_JSON_VERSION = 1 as const;
export const CUSTOM_VIEW_DEFINITION_JSON_KIND =
  "custom-view-definition" as const;
export const CUSTOM_VIEWS_CATALOG_JSON_KIND = "custom-views-catalog" as const;

export interface CustomViewDefinitionJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly CustomViewDefinitionJsonError[];
    };

const portableCustomViewDefinitionSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    viewId: z
      .string()
      .trim()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9_-]*$/i, {
        message:
          "viewId must start with a letter or number and contain only letters, numbers, underscores, or hyphens.",
      }),
    entityQueryDefinitionName: z.string().trim().min(1),
    status: z.enum(CUSTOM_VIEW_STATUSES).default("ACTIVE"),
    hiddenFromNav: z.boolean().optional(),
    navCategoryId: z.string().trim().min(1).optional(),
    navOrder: z.number().int().optional(),
    nav: customViewNavConfigSchema,
    ui: customViewUIConfigSchema.optional(),
  })
  .strict();

export type PortableCustomViewDefinition = z.infer<
  typeof portableCustomViewDefinitionSchema
>;

const customViewDefinitionEnvelopeSchema = z.object({
  kind: z.literal(CUSTOM_VIEW_DEFINITION_JSON_KIND),
  version: z.literal(CUSTOM_VIEW_DEFINITION_JSON_VERSION),
  data: portableCustomViewDefinitionSchema,
});

export type CustomViewDefinitionFormData = z.infer<
  typeof customViewDefinitionEnvelopeSchema
>["data"];

const customViewsCatalogEnvelopeSchema = z.object({
  kind: z.literal(CUSTOM_VIEWS_CATALOG_JSON_KIND),
  version: z.literal(CUSTOM_VIEW_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  customViews: z.array(portableCustomViewDefinitionSchema).min(1),
});

export { customViewsCatalogEnvelopeSchema };

export type CustomViewsCatalogEnvelope = z.infer<
  typeof customViewsCatalogEnvelopeSchema
>;

export interface CatalogReplacePlan {
  readonly toCreate: readonly PortableCustomViewDefinition[];
  readonly toUpdate: readonly {
    readonly existing: CustomViewRecord;
    readonly input: PortableCustomViewDefinition;
  }[];
  readonly toDelete: readonly CustomViewRecord[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly CustomViewDefinitionJsonError[] {
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
  views: readonly PortableCustomViewDefinition[],
): readonly CustomViewDefinitionJsonError[] {
  const errors: CustomViewDefinitionJsonError[] = [];
  const viewIdCounts = new Map<string, number>();

  for (const view of views) {
    viewIdCounts.set(view.viewId, (viewIdCounts.get(view.viewId) ?? 0) + 1);
  }

  for (const [viewId, count] of viewIdCounts) {
    if (count > 1) {
      errors.push({
        path: "customViews",
        message: `Duplicate viewId "${viewId}".`,
      });
    }
  }

  return errors;
}

export function toPortableCustomViewDefinition(
  record: CustomViewRecord,
  options: { readonly entityQueryDefinitionName: string },
): PortableCustomViewDefinition {
  const {
    id: _id,
    tenantId: _tenantId,
    sourceEntity: _sourceEntity,
    entityQueryDefinitionId: _entityQueryDefinitionId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    name,
    description,
    viewId,
    status,
    hiddenFromNav,
    navCategoryId,
    navOrder,
    nav,
    ui,
  } = record;
  void _id;
  void _tenantId;
  void _sourceEntity;
  void _entityQueryDefinitionId;
  void _createdAt;
  void _updatedAt;

  return portableCustomViewDefinitionSchema.parse({
    name,
    ...(description !== undefined ? { description } : {}),
    viewId,
    entityQueryDefinitionName: options.entityQueryDefinitionName,
    status,
    ...(hiddenFromNav !== undefined ? { hiddenFromNav } : {}),
    ...(navCategoryId !== undefined ? { navCategoryId } : {}),
    ...(navOrder !== undefined ? { navOrder } : {}),
    nav,
    ui,
  });
}

export function portableToCreateCustomViewInput(
  portable: PortableCustomViewDefinition,
  entityQueryDefinitionId: string,
): CreateCustomViewInput {
  return {
    name: portable.name,
    ...(portable.description !== undefined
      ? { description: portable.description }
      : {}),
    viewId: portable.viewId,
    entityQueryDefinitionId,
    status: portable.status,
    ...(portable.hiddenFromNav !== undefined
      ? { hiddenFromNav: portable.hiddenFromNav }
      : {}),
    ...(portable.navCategoryId !== undefined
      ? { navCategoryId: portable.navCategoryId }
      : {}),
    ...(portable.navOrder !== undefined ? { navOrder: portable.navOrder } : {}),
    nav: portable.nav,
    ...(portable.ui !== undefined ? { ui: portable.ui } : {}),
  };
}

export function createCustomViewDefinitionEnvelope(
  data: CustomViewDefinitionFormData,
): {
  readonly kind: typeof CUSTOM_VIEW_DEFINITION_JSON_KIND;
  readonly version: typeof CUSTOM_VIEW_DEFINITION_JSON_VERSION;
  readonly data: CustomViewDefinitionFormData;
} {
  return {
    kind: CUSTOM_VIEW_DEFINITION_JSON_KIND,
    version: CUSTOM_VIEW_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createCustomViewsCatalogEnvelope(
  views: readonly PortableCustomViewDefinition[],
  options?: { readonly exportedAt?: string },
): CustomViewsCatalogEnvelope {
  return {
    kind: CUSTOM_VIEWS_CATALOG_JSON_KIND,
    version: CUSTOM_VIEW_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    customViews: [...views],
  };
}

export function parseCustomViewDefinitionJson(
  text: string,
): JsonImportResult<CustomViewDefinitionFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = customViewDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function validateCustomViewDefinitionImport(
  text: string,
): JsonImportResult<CustomViewDefinitionFormData> {
  return parseCustomViewDefinitionJson(text);
}

export function parseCustomViewsCatalogJson(
  text: string,
): JsonImportResult<CustomViewsCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = customViewsCatalogEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.customViews,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateCustomViewsCatalogImport(
  text: string,
): JsonImportResult<CustomViewsCatalogEnvelope> {
  return parseCustomViewsCatalogJson(text);
}

export function validateCustomViewsCatalogEnvelope(
  input: unknown,
): JsonImportResult<CustomViewsCatalogEnvelope> {
  const result = customViewsCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.customViews,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeCatalogReplacePlan(input: {
  readonly existing: readonly CustomViewRecord[];
  readonly imported: readonly PortableCustomViewDefinition[];
}): CatalogReplacePlan {
  const existingByViewId = new Map(
    input.existing.map((record) => [record.viewId, record]),
  );
  const importedByViewId = new Map(
    input.imported.map((record) => [record.viewId, record]),
  );

  const toCreate: PortableCustomViewDefinition[] = [];
  const toUpdate: CatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: CustomViewRecord[] = [];

  for (const imported of input.imported) {
    const existing = existingByViewId.get(imported.viewId);
    if (existing) {
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  for (const existing of input.existing) {
    if (!importedByViewId.has(existing.viewId)) {
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
