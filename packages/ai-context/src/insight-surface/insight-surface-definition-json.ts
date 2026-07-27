import { z } from "zod";

import {
  createInsightSurfaceInputSchema,
  INSIGHT_SURFACE_DEFINITION_JSON_KIND,
  INSIGHT_SURFACE_DEFINITION_JSON_VERSION,
  INSIGHT_SURFACES_CATALOG_JSON_KIND,
  type CreateInsightSurfaceInput,
  type InsightSurfaceDefinition,
} from "./insight-surface-definition.js";

export interface InsightSurfaceJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly InsightSurfaceJsonError[];
    };

const portableInsightSurfaceSchema = createInsightSurfaceInputSchema;

export type PortableInsightSurface = z.infer<
  typeof portableInsightSurfaceSchema
>;

const insightSurfaceEnvelopeSchema = z.object({
  kind: z.literal(INSIGHT_SURFACE_DEFINITION_JSON_KIND),
  version: z.literal(INSIGHT_SURFACE_DEFINITION_JSON_VERSION),
  data: portableInsightSurfaceSchema,
});

export type InsightSurfaceFormData = z.infer<
  typeof insightSurfaceEnvelopeSchema
>["data"];

export const insightSurfacesCatalogEnvelopeSchema = z.object({
  kind: z.literal(INSIGHT_SURFACES_CATALOG_JSON_KIND),
  version: z.literal(INSIGHT_SURFACE_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  insightSurfaces: z.array(portableInsightSurfaceSchema).min(1),
});

export type InsightSurfacesCatalogEnvelope = z.infer<
  typeof insightSurfacesCatalogEnvelopeSchema
>;

export interface InsightSurfaceCatalogReplacePlan {
  readonly toCreate: readonly CreateInsightSurfaceInput[];
  readonly toUpdate: readonly {
    readonly existing: InsightSurfaceDefinition;
    readonly input: CreateInsightSurfaceInput;
  }[];
  readonly toDelete: readonly InsightSurfaceDefinition[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly InsightSurfaceJsonError[] {
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
  surfaces: readonly CreateInsightSurfaceInput[],
): readonly InsightSurfaceJsonError[] {
  const errors: InsightSurfaceJsonError[] = [];
  const idCounts = new Map<string, number>();

  for (const surface of surfaces) {
    idCounts.set(surface.id, (idCounts.get(surface.id) ?? 0) + 1);
  }

  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({
        path: "insightSurfaces",
        message: `Duplicate insight surface id "${id}".`,
      });
    }
  }

  return errors;
}

export function toPortableInsightSurface(
  record: InsightSurfaceDefinition,
): CreateInsightSurfaceInput {
  const {
    tenantId: _tenantId,
    version: _version,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...portable
  } = record;
  void _tenantId;
  void _version;
  void _createdAt;
  void _updatedAt;
  return createInsightSurfaceInputSchema.parse(portable);
}

export function createInsightSurfaceEnvelope(data: InsightSurfaceFormData): {
  readonly kind: typeof INSIGHT_SURFACE_DEFINITION_JSON_KIND;
  readonly version: typeof INSIGHT_SURFACE_DEFINITION_JSON_VERSION;
  readonly data: InsightSurfaceFormData;
} {
  return {
    kind: INSIGHT_SURFACE_DEFINITION_JSON_KIND,
    version: INSIGHT_SURFACE_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createInsightSurfacesCatalogEnvelope(
  surfaces: readonly InsightSurfaceDefinition[],
  options?: { readonly exportedAt?: string },
): InsightSurfacesCatalogEnvelope {
  return {
    kind: INSIGHT_SURFACES_CATALOG_JSON_KIND,
    version: INSIGHT_SURFACE_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    insightSurfaces: surfaces.map(toPortableInsightSurface),
  };
}

export function parseInsightSurfaceDefinitionJson(
  text: string,
): JsonImportResult<InsightSurfaceFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = insightSurfaceEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function parseInsightSurfacesCatalogJson(
  text: string,
): JsonImportResult<InsightSurfacesCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = insightSurfacesCatalogEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.insightSurfaces,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateInsightSurfacesCatalogEnvelope(
  input: unknown,
): JsonImportResult<InsightSurfacesCatalogEnvelope> {
  const result = insightSurfacesCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.insightSurfaces,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeInsightSurfaceCatalogReplacePlan(input: {
  readonly existing: readonly InsightSurfaceDefinition[];
  readonly imported: readonly CreateInsightSurfaceInput[];
}): InsightSurfaceCatalogReplacePlan {
  const existingById = new Map(
    input.existing.map((record) => [record.id, record]),
  );
  const importedById = new Map(
    input.imported.map((record) => [record.id, record]),
  );

  const toCreate: CreateInsightSurfaceInput[] = [];
  const toUpdate: InsightSurfaceCatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: InsightSurfaceDefinition[] = [];

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

export function resolveSurfaceLabels(
  surface: Pick<InsightSurfaceDefinition, "labels">,
  locale: string,
): {
  readonly title: string;
  readonly description?: string;
  readonly emptyScope?: string;
  readonly seeAll?: string;
  readonly refreshAction?: string;
  readonly portfolioNarrativeTitle?: string;
  readonly summary: Readonly<Record<string, string>>;
} {
  const preferred =
    surface.labels[locale] ??
    surface.labels[locale.split("-")[0] ?? ""] ??
    surface.labels.en ??
    Object.values(surface.labels)[0];

  return {
    title: preferred?.title ?? "Insights",
    ...(preferred?.description ? { description: preferred.description } : {}),
    ...(preferred?.emptyScope ? { emptyScope: preferred.emptyScope } : {}),
    ...(preferred?.seeAll ? { seeAll: preferred.seeAll } : {}),
    ...(preferred?.refreshAction
      ? { refreshAction: preferred.refreshAction }
      : {}),
    ...(preferred?.portfolioNarrativeTitle
      ? { portfolioNarrativeTitle: preferred.portfolioNarrativeTitle }
      : {}),
    summary: preferred?.summary ?? {},
  };
}

export function resolveChatProgressLabel(
  surface: Pick<InsightSurfaceDefinition, "chat">,
  locale: string,
): string {
  return (
    surface.chat.progressLabel[locale] ??
    surface.chat.progressLabel[locale.split("-")[0] ?? ""] ??
    surface.chat.progressLabel.en ??
    Object.values(surface.chat.progressLabel)[0] ??
    "Reading insights…"
  );
}
