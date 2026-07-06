import { z } from "zod";

import {
  createChartDefinitionInputSchema,
  type ChartDefinitionRecord,
  type CreateChartDefinitionInput,
} from "./types.js";

export const CHART_DEFINITION_JSON_VERSION = 1 as const;
export const CHART_DEFINITION_JSON_KIND = "chart-definition" as const;
export const CHART_DEFINITIONS_CATALOG_JSON_KIND =
  "chart-definitions-catalog" as const;

export interface ChartDefinitionJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly ChartDefinitionJsonError[];
    };

const portableChartDefinitionSchema = createChartDefinitionInputSchema;

export type PortableChartDefinition = z.infer<
  typeof portableChartDefinitionSchema
>;

const chartDefinitionEnvelopeSchema = z.object({
  kind: z.literal(CHART_DEFINITION_JSON_KIND),
  version: z.literal(CHART_DEFINITION_JSON_VERSION),
  data: portableChartDefinitionSchema,
});

export type ChartDefinitionFormData = z.infer<
  typeof chartDefinitionEnvelopeSchema
>["data"];

export const chartDefinitionsCatalogEnvelopeSchema = z.object({
  kind: z.literal(CHART_DEFINITIONS_CATALOG_JSON_KIND),
  version: z.literal(CHART_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  chartDefinitions: z.array(portableChartDefinitionSchema).min(1),
});

export type ChartDefinitionsCatalogEnvelope = z.infer<
  typeof chartDefinitionsCatalogEnvelopeSchema
>;

export interface CatalogReplacePlan {
  readonly toCreate: readonly CreateChartDefinitionInput[];
  readonly toUpdate: readonly {
    readonly existing: ChartDefinitionRecord;
    readonly input: CreateChartDefinitionInput;
  }[];
  readonly toDelete: readonly ChartDefinitionRecord[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly ChartDefinitionJsonError[] {
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
  definitions: readonly CreateChartDefinitionInput[],
): readonly ChartDefinitionJsonError[] {
  const errors: ChartDefinitionJsonError[] = [];
  const nameCounts = new Map<string, number>();

  for (const definition of definitions) {
    nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
  }

  for (const [name, count] of nameCounts) {
    if (count > 1) {
      errors.push({
        path: "chartDefinitions",
        message: `Duplicate chart name "${name}".`,
      });
    }
  }

  return errors;
}

export function toPortableChartDefinition(
  record: ChartDefinitionRecord,
): CreateChartDefinitionInput {
  const {
    id: _id,
    tenantId: _tenantId,
    chartId: _chartId,
    version: _version,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    name,
    description,
    chartType,
    displayMode,
    dataSource,
    series,
    xAxis,
    yAxis,
    legend,
    grid,
    animation,
    status,
  } = record;
  void _id;
  void _tenantId;
  void _chartId;
  void _version;
  void _createdAt;
  void _updatedAt;

  return createChartDefinitionInputSchema.parse({
    name,
    ...(description !== undefined ? { description } : {}),
    chartType,
    ...(displayMode !== undefined ? { displayMode } : {}),
    dataSource,
    ...(series !== undefined ? { series } : {}),
    ...(xAxis !== undefined ? { xAxis } : {}),
    ...(yAxis !== undefined ? { yAxis } : {}),
    ...(legend !== undefined ? { legend } : {}),
    ...(grid !== undefined ? { grid } : {}),
    ...(animation !== undefined ? { animation } : {}),
    status,
  });
}

export function createChartDefinitionEnvelope(data: ChartDefinitionFormData): {
  readonly kind: typeof CHART_DEFINITION_JSON_KIND;
  readonly version: typeof CHART_DEFINITION_JSON_VERSION;
  readonly data: ChartDefinitionFormData;
} {
  return {
    kind: CHART_DEFINITION_JSON_KIND,
    version: CHART_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createChartDefinitionsCatalogEnvelope(
  definitions: readonly ChartDefinitionRecord[],
  options?: { readonly exportedAt?: string },
): ChartDefinitionsCatalogEnvelope {
  return {
    kind: CHART_DEFINITIONS_CATALOG_JSON_KIND,
    version: CHART_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    chartDefinitions: definitions.map(toPortableChartDefinition),
  };
}

export function parseChartDefinitionJson(
  text: string,
): JsonImportResult<ChartDefinitionFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = chartDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function parseChartDefinitionsCatalogJson(
  text: string,
): JsonImportResult<ChartDefinitionsCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = chartDefinitionsCatalogEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.chartDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateChartDefinitionsCatalogEnvelope(
  input: unknown,
): JsonImportResult<ChartDefinitionsCatalogEnvelope> {
  const result = chartDefinitionsCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.chartDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeCatalogReplacePlan(input: {
  readonly existing: readonly ChartDefinitionRecord[];
  readonly imported: readonly CreateChartDefinitionInput[];
}): CatalogReplacePlan {
  const existingByName = new Map(
    input.existing.map((record) => [record.name, record]),
  );
  const importedByName = new Map(
    input.imported.map((record) => [record.name, record]),
  );

  const toCreate: CreateChartDefinitionInput[] = [];
  const toUpdate: CatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: ChartDefinitionRecord[] = [];

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
    toDelete,
    counts: {
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    },
  };
}

export function parseChartDefinitionsCatalogJsonFromUnknown(
  input: unknown,
): ChartDefinitionsCatalogEnvelope {
  const result = validateChartDefinitionsCatalogEnvelope(input);
  if (!result.ok) {
    throw new Error(result.errors.map((entry) => entry.message).join(" "));
  }
  return result.data;
}
