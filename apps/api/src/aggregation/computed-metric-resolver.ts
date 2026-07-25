import {
  evaluateEntityQueryFilterTree,
  expandRelationFiltersInTree,
  isEmptyFilterTree,
  resolveQueryExecutionNowFromDateBucket,
  type EntityCatalogEntry,
} from "@repo/entity-queries";
import {
  buildMetricDocId,
  evaluateComputedMetric,
  readPrimaryNumericValueFromRow,
  resolveMetricOwnerId,
  type ComputedMetricInputResolver,
  type MetricDefinitionRecord,
} from "@repo/metrics-engine";
import type {
  EntityQueryDefinitionRepository,
  MetricDefinitionRepository,
  MetricValueRepository,
} from "@repo/firestore-converters";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import {
  createListChildRecords,
  buildEntityCatalog,
} from "./metric-query-runtime.js";
import { listSourceDocumentsForMetric } from "./list-source-documents.js";

async function resolveMetricDefinitionByReference(
  repository: MetricDefinitionRepository,
  tenantId: string,
  reference: string,
): Promise<MetricDefinitionRecord | null> {
  const normalized = reference.trim();
  if (normalized.length === 0) {
    return null;
  }

  const byId = await repository.getById(tenantId, normalized);
  if (byId) {
    return byId;
  }

  const all = await repository.list(tenantId);
  const normalizedName = normalized.toLowerCase();
  return (
    all.find((item) => item.metricId === normalized) ??
    all.find((item) => item.name.trim().toLowerCase() === normalizedName) ??
    null
  );
}

async function resolveQueryDefinitionByReference(
  repository: EntityQueryDefinitionRepository,
  tenantId: string,
  reference: string,
) {
  const normalized = reference.trim();
  if (normalized.length === 0) {
    return null;
  }

  const byId = await repository.getById(tenantId, normalized);
  if (byId) {
    return byId;
  }

  const all = await repository.list(tenantId);
  const normalizedName = normalized.toLowerCase();
  return (
    all.find((item) => item.queryId === normalized) ??
    all.find((item) => item.name.trim().toLowerCase() === normalizedName) ??
    null
  );
}

function recordIsReadableByUser(
  record: Record<string, unknown>,
  userId: string,
): boolean {
  const accessUserIds = record.accessUserIds;
  if (Array.isArray(accessUserIds) && accessUserIds.includes(userId)) {
    return true;
  }
  return resolveMetricOwnerId(record) === userId;
}

function aggregateRecords(
  records: readonly Record<string, unknown>[],
  field: string | undefined,
  operation: "SUM" | "COUNT" | "AVG" = "SUM",
): number | null {
  if (records.length === 0) {
    return operation === "COUNT" || operation === "SUM" ? 0 : null;
  }

  if (operation === "COUNT") {
    return records.length;
  }

  const targetField = field ?? "amount";
  const values = records
    .map((record) => record[targetField])
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );

  if (values.length === 0) {
    return operation === "SUM" ? 0 : null;
  }

  if (operation === "SUM") {
    return values.reduce((total, value) => total + value, 0);
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function createComputedMetricInputResolver(input: {
  readonly tenantId: string;
  readonly entityRuntime: EntityRuntimeContext;
  readonly metricDefinitionRepository: MetricDefinitionRepository;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
  readonly metricValueRepository: MetricValueRepository;
}): ComputedMetricInputResolver {
  const catalogCache = new Map<string, readonly EntityCatalogEntry[]>();

  function getCatalog(): readonly EntityCatalogEntry[] {
    const cached = catalogCache.get(input.tenantId);
    if (cached) {
      return cached;
    }
    const catalog = buildEntityCatalog(input.entityRuntime, input.tenantId);
    catalogCache.set(input.tenantId, catalog);
    return catalog;
  }

  return {
    resolveMetricDefinition: (metricDefinitionId) =>
      resolveMetricDefinitionByReference(
        input.metricDefinitionRepository,
        input.tenantId,
        metricDefinitionId,
      ),

    readMetricRowValue: async ({ definition, group, dimensions, userId }) => {
      const docId = buildMetricDocId(userId, group, dimensions);
      const record = await input.metricValueRepository.getById(
        input.tenantId,
        definition.target.collection,
        docId,
      );
      return readPrimaryNumericValueFromRow(definition, record?.values);
    },

    readQueryRefValue: async ({
      queryDefinitionId,
      parameterValues,
      aggregationField,
      aggregationOperation = "SUM",
      userId,
    }) => {
      const definition = await resolveQueryDefinitionByReference(
        input.entityQueryDefinitionRepository,
        input.tenantId,
        queryDefinitionId,
      );
      if (!definition) {
        return null;
      }

      const documents = await listSourceDocumentsForMetric(
        input.entityRuntime,
        input.tenantId,
        definition.sourceEntity,
      );
      const listChildRecords = createListChildRecords(
        input.entityRuntime,
        input.tenantId,
      );
      const catalog = getCatalog();

      // Expand relation filters once for the whole evaluation. Expanding inside
      // per-record matching re-lists related entities (e.g. financialItem) for
      // every paymentSchedule row and makes Due Today KPIs unusable.
      // Anchor temporal presets (startOfWeek / today / …) to the `period`
      // parameter when present so dashboard date filter drives week windows.
      const queryOptions = {
        parameters: definition.parameters ?? [],
        parameterValues,
        now: resolveQueryExecutionNowFromDateBucket(parameterValues?.period),
      };

      let expandedFilterTree = null;
      if (!isEmptyFilterTree(definition.filter)) {
        const expanded = await expandRelationFiltersInTree({
          sourceEntity: definition.sourceEntity,
          catalog,
          filter: definition.filter,
          listChildRecords,
          options: queryOptions,
        });
        if (expanded.emptyResult) {
          return aggregateRecords([], aggregationField, aggregationOperation);
        }
        expandedFilterTree = expanded.filterTree;
      }

      const matched: Record<string, unknown>[] = [];
      for (const document of documents) {
        if (!recordIsReadableByUser(document.record, userId)) {
          continue;
        }

        const included =
          expandedFilterTree == null
            ? true
            : evaluateEntityQueryFilterTree(
                document.record,
                expandedFilterTree,
              );
        if (included) {
          matched.push(document.record);
        }
      }

      return aggregateRecords(matched, aggregationField, aggregationOperation);
    },
  };
}

export async function evaluateComputedMetricForUser(input: {
  readonly tenantId: string;
  readonly userId: string;
  readonly definition: MetricDefinitionRecord;
  readonly providedParameters: Readonly<Record<string, unknown>>;
  readonly entityRuntime: EntityRuntimeContext;
  readonly metricDefinitionRepository: MetricDefinitionRepository;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
  readonly metricValueRepository: MetricValueRepository;
}) {
  return evaluateComputedMetric({
    definition: input.definition,
    providedParameters: input.providedParameters,
    userId: input.userId,
    resolver: createComputedMetricInputResolver(input),
  });
}
