import {
  computeCatalogReplacePlan,
  listBackfillRelevantChangedFields,
  metricDefinitionNeedsBackfill,
  type CreateMetricDefinitionInput,
  type MetricDefinitionRecord,
  type MetricDefinitionsCatalogEnvelope,
  type PatchMetricDefinitionInput,
} from "@repo/metrics-engine";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { EntityQueryDefinitionRepository } from "@repo/firestore-converters";
import type { MetricRuntimeContext } from "./metric-runtime-context.js";
import { runMetricBackfill } from "./run-backfill.js";
import {
  findEntityForSourceModel,
  validateMetricDefinitionDateGranularity,
} from "./validate-metric-definition-entity.js";
import { resolveValidatedMetricCreateInput } from "./validate-metric-definition-query-source.js";

interface ReplaceMetricDefinitionsCatalogDeps {
  readonly entityRuntime: EntityRuntimeContext;
  readonly metricRuntime: MetricRuntimeContext;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
}

export class MetricCatalogReplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetricCatalogReplaceError";
  }
}

interface ReplaceMetricDefinitionsCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly backfillSummary: {
    readonly created: number;
    readonly updated: number;
    readonly skipped: number;
    readonly failed: number;
  };
  readonly items: readonly MetricDefinitionRecord[];
}

function createPatchFromCreateInput(
  imported: CreateMetricDefinitionInput,
  options?: { readonly version?: number },
): PatchMetricDefinitionInput {
  return {
    name: imported.name,
    ...(imported.description !== undefined
      ? { description: imported.description }
      : {}),
    filters: imported.filters,
    groupBy: imported.groupBy,
    dimensions: imported.dimensions,
    dateFieldGranularity: imported.dateFieldGranularity,
    valueDisplayFormat: imported.valueDisplayFormat,
    aggregations: imported.aggregations,
    version: options?.version ?? imported.version,
    schemaVersionDependency: imported.schemaVersionDependency,
    fieldsDependency: imported.fieldsDependency,
    status: imported.status,
  };
}

function getAvailableEntityNames(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): readonly string[] {
  return entityRuntime
    .getEntitiesForTenant(tenantId)
    .map((entity) => entity.name);
}

function assertMetricImportValid(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
  imported: CreateMetricDefinitionInput,
  availableNames: readonly string[],
): void {
  if (!availableNames.includes(imported.sourceModel)) {
    throw new MetricCatalogReplaceError(
      `Unknown source model "${imported.sourceModel}".`,
    );
  }

  const sourceEntity = findEntityForSourceModel(
    entityRuntime.getEntitiesForTenant(tenantId),
    imported.sourceModel,
  );
  if (sourceEntity) {
    const dateGranularityError = validateMetricDefinitionDateGranularity(
      sourceEntity,
      {
        groupBy: imported.groupBy,
        dimensions: imported.dimensions,
        dateFieldGranularity: imported.dateFieldGranularity,
      },
    );
    if (dateGranularityError) {
      throw new MetricCatalogReplaceError(dateGranularityError);
    }
  }
}

async function resolveMetricCreateInput(
  entityQueryDefinitionRepository: EntityQueryDefinitionRepository,
  tenantId: string,
  imported: CreateMetricDefinitionInput,
): Promise<CreateMetricDefinitionInput> {
  const resolved = await resolveValidatedMetricCreateInput(
    entityQueryDefinitionRepository,
    tenantId,
    imported,
  );
  if (!resolved.ok) {
    throw new MetricCatalogReplaceError(resolved.error);
  }
  return resolved.input;
}

async function runBackfillSafely(
  metricRuntime: MetricRuntimeContext,
  tenantId: string,
  metricDefinitionId: string,
  options?: {
    readonly previousVersion?: number;
    readonly changedDefinitionFields?: readonly string[];
  },
): Promise<void> {
  await runMetricBackfill(metricRuntime, tenantId, metricDefinitionId, options);
}

export async function replaceMetricDefinitionsCatalog(
  deps: ReplaceMetricDefinitionsCatalogDeps,
  tenantId: string,
  catalog: MetricDefinitionsCatalogEnvelope,
): Promise<ReplaceMetricDefinitionsCatalogResult> {
  const existing =
    await deps.metricRuntime.metricDefinitionRepository.list(tenantId);
  const plan = computeCatalogReplacePlan({
    existing,
    imported: catalog.metricDefinitions,
  });

  await deps.entityRuntime.loadTenantDefinitions(tenantId);
  const availableNames = getAvailableEntityNames(deps.entityRuntime, tenantId);

  for (const imported of catalog.metricDefinitions) {
    assertMetricImportValid(
      deps.entityRuntime,
      tenantId,
      imported,
      availableNames,
    );
    await resolveMetricCreateInput(
      deps.entityQueryDefinitionRepository,
      tenantId,
      imported,
    );
  }

  for (const record of plan.toDelete) {
    await deps.metricRuntime.metricDefinitionRepository.delete(
      tenantId,
      record.id,
    );
  }

  const backfillSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const { existing: current, input } of plan.toUpdate) {
    const changedFields = listBackfillRelevantChangedFields({
      existing: current,
      imported: input,
    });
    const needsBackfill = metricDefinitionNeedsBackfill({
      existing: current,
      imported: input,
    });
    const nextVersion =
      needsBackfill && input.version <= current.version
        ? current.version + 1
        : input.version;

    const updated = await deps.metricRuntime.metricDefinitionRepository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input, { version: nextVersion }),
    );

    if (!needsBackfill) {
      backfillSummary.skipped += 1;
      continue;
    }

    try {
      const hasPriorBackfill =
        await deps.metricRuntime.backfillJobRepository.hasCompletedBackfillForMetric(
          tenantId,
          updated.id,
        );
      await runBackfillSafely(
        deps.metricRuntime,
        tenantId,
        updated.id,
        hasPriorBackfill
          ? {
              previousVersion: current.version,
              changedDefinitionFields: changedFields,
            }
          : undefined,
      );
      backfillSummary.updated += 1;
    } catch {
      backfillSummary.failed += 1;
    }
  }

  for (const input of plan.toCreate) {
    const resolvedInput = await resolveMetricCreateInput(
      deps.entityQueryDefinitionRepository,
      tenantId,
      input,
    );
    const created = await deps.metricRuntime.metricDefinitionRepository.create(
      tenantId,
      resolvedInput,
    );

    try {
      await runBackfillSafely(deps.metricRuntime, tenantId, created.id);
      backfillSummary.created += 1;
    } catch {
      backfillSummary.failed += 1;
    }
  }

  deps.metricRuntime.invalidateTenantMetrics(tenantId);

  const items =
    await deps.metricRuntime.metricDefinitionRepository.list(tenantId);

  return {
    counts: plan.counts,
    backfillSummary,
    items,
  };
}
