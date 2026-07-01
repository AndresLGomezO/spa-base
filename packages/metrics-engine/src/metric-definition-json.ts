import { z } from "zod";

import {
  createMetricDefinitionInputSchema,
  type CreateMetricDefinitionInput,
  type MetricDefinitionRecord,
} from "./types.js";

export const METRIC_DEFINITION_JSON_VERSION = 1 as const;
export const METRIC_DEFINITION_JSON_KIND = "metric-definition" as const;
export const METRIC_DEFINITIONS_CATALOG_JSON_KIND =
  "metric-definitions-catalog" as const;

export interface MetricDefinitionJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly MetricDefinitionJsonError[];
    };

const portableMetricDefinitionSchema = createMetricDefinitionInputSchema;

export type PortableMetricDefinition = z.infer<
  typeof portableMetricDefinitionSchema
>;

const metricDefinitionEnvelopeSchema = z.object({
  kind: z.literal(METRIC_DEFINITION_JSON_KIND),
  version: z.literal(METRIC_DEFINITION_JSON_VERSION),
  data: portableMetricDefinitionSchema,
});

export type MetricDefinitionFormData = z.infer<
  typeof metricDefinitionEnvelopeSchema
>["data"];

const metricDefinitionsCatalogEnvelopeSchema = z.object({
  kind: z.literal(METRIC_DEFINITIONS_CATALOG_JSON_KIND),
  version: z.literal(METRIC_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  metricDefinitions: z.array(portableMetricDefinitionSchema).min(1),
});

export { metricDefinitionsCatalogEnvelopeSchema };

export type MetricDefinitionsCatalogEnvelope = z.infer<
  typeof metricDefinitionsCatalogEnvelopeSchema
>;

export interface CatalogReplacePlan {
  readonly toCreate: readonly CreateMetricDefinitionInput[];
  readonly toUpdate: readonly {
    readonly existing: MetricDefinitionRecord;
    readonly input: CreateMetricDefinitionInput;
  }[];
  readonly toDelete: readonly MetricDefinitionRecord[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly MetricDefinitionJsonError[] {
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
  definitions: readonly CreateMetricDefinitionInput[],
): readonly MetricDefinitionJsonError[] {
  const errors: MetricDefinitionJsonError[] = [];
  const nameCounts = new Map<string, number>();

  for (const definition of definitions) {
    nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
  }

  for (const [name, count] of nameCounts) {
    if (count > 1) {
      errors.push({
        path: "metricDefinitions",
        message: `Duplicate metric name "${name}".`,
      });
    }
  }

  return errors;
}

export function toPortableMetricDefinition(
  record: MetricDefinitionRecord,
): CreateMetricDefinitionInput {
  const {
    id: _id,
    tenantId: _tenantId,
    metricId: _metricId,
    target: _target,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...portable
  } = record;
  void _id;
  void _tenantId;
  void _metricId;
  void _target;
  void _createdAt;
  void _updatedAt;
  return portable;
}

export function createMetricDefinitionEnvelope(
  data: MetricDefinitionFormData,
): {
  readonly kind: typeof METRIC_DEFINITION_JSON_KIND;
  readonly version: typeof METRIC_DEFINITION_JSON_VERSION;
  readonly data: MetricDefinitionFormData;
} {
  return {
    kind: METRIC_DEFINITION_JSON_KIND,
    version: METRIC_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createMetricDefinitionsCatalogEnvelope(
  definitions: readonly MetricDefinitionRecord[],
  options?: { readonly exportedAt?: string },
): MetricDefinitionsCatalogEnvelope {
  return {
    kind: METRIC_DEFINITIONS_CATALOG_JSON_KIND,
    version: METRIC_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    metricDefinitions: definitions.map(toPortableMetricDefinition),
  };
}

export function parseMetricDefinitionJson(
  text: string,
): JsonImportResult<MetricDefinitionFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = metricDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function validateMetricDefinitionImport(
  text: string,
): JsonImportResult<MetricDefinitionFormData> {
  return parseMetricDefinitionJson(text);
}

export function parseMetricDefinitionsCatalogJson(
  text: string,
): JsonImportResult<MetricDefinitionsCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = metricDefinitionsCatalogEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.metricDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateMetricDefinitionsCatalogImport(
  text: string,
): JsonImportResult<MetricDefinitionsCatalogEnvelope> {
  return parseMetricDefinitionsCatalogJson(text);
}

export function validateMetricDefinitionsCatalogEnvelope(
  input: unknown,
): JsonImportResult<MetricDefinitionsCatalogEnvelope> {
  const result = metricDefinitionsCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.metricDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeCatalogReplacePlan(input: {
  readonly existing: readonly MetricDefinitionRecord[];
  readonly imported: readonly CreateMetricDefinitionInput[];
}): CatalogReplacePlan {
  const existingByName = new Map(
    input.existing.map((record) => [record.name, record]),
  );
  const importedByName = new Map(
    input.imported.map((record) => [record.name, record]),
  );

  const toCreate: CreateMetricDefinitionInput[] = [];
  const toUpdate: CatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: MetricDefinitionRecord[] = [];

  for (const imported of input.imported) {
    const existing = existingByName.get(imported.name);
    if (existing) {
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  for (const existing of input.existing) {
    if (!importedByName.has(existing.name)) {
      toDelete.push(existing);
    }
  }

  return {
    toCreate,
    toUpdate,
    counts: {
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    },
    toDelete,
  };
}

const BACKFILL_RELEVANT_FIELDS = [
  "filters",
  "groupBy",
  "dimensions",
  "dateFieldGranularity",
  "aggregations",
  "fieldsDependency",
  "schemaVersionDependency",
  "sourceModel",
] as const;

export function listBackfillRelevantChangedFields(input: {
  readonly existing: MetricDefinitionRecord;
  readonly imported: CreateMetricDefinitionInput;
}): readonly string[] {
  const changed: string[] = [];

  for (const field of BACKFILL_RELEVANT_FIELDS) {
    const before = JSON.stringify(input.existing[field]);
    const after = JSON.stringify(input.imported[field]);
    if (before !== after) {
      changed.push(field);
    }
  }

  return changed;
}

export function metricDefinitionNeedsBackfill(input: {
  readonly existing: MetricDefinitionRecord;
  readonly imported: CreateMetricDefinitionInput;
}): boolean {
  return listBackfillRelevantChangedFields(input).length > 0;
}
