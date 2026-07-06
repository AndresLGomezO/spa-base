import {
  evaluateEntityQueryFilterTree,
  recordMatchesEntityQueryDefinition,
  resolveEntityQueryDefinitionByReference,
  type EntityCatalogEntry,
  type EntityQueryFilterOperator,
} from "@repo/entity-queries";
import type { SourceDocumentSnapshot } from "@repo/aggregation-engine";
import type { MetricDefinitionRecord } from "@repo/metrics-engine";
import type { EntityQueryDefinitionRepository } from "@repo/firestore-converters";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { listSourceDocumentsForMetric } from "./list-source-documents.js";

const CHILD_RECORD_PAGE_SIZE = 500;

function evaluateFlatFilters(
  record: Record<string, unknown>,
  filters: readonly {
    readonly field: string;
    readonly operator: EntityQueryFilterOperator;
    readonly value: unknown;
  }[],
): boolean {
  if (filters.length === 0) {
    return true;
  }

  return evaluateEntityQueryFilterTree(record, {
    type: "group",
    combinator: "and",
    children: filters.map((filter) => ({
      type: "condition" as const,
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
    })),
  });
}

async function listEntityRecords(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
  entityName: string,
  maxItems: number,
): Promise<readonly Record<string, unknown>[]> {
  const repository = entityRuntime.getRepository(tenantId, entityName);
  if (!repository) {
    return [];
  }

  const records: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    const page = await repository.findAll({
      tenantId,
      limit: CHILD_RECORD_PAGE_SIZE,
      cursor,
    });
    records.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && records.length < maxItems);

  return records.slice(0, maxItems);
}

export function createListChildRecords(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
) {
  return async (
    entityName: string,
    query: {
      readonly filter: readonly {
        readonly field: string;
        readonly operator: EntityQueryFilterOperator;
        readonly value: unknown;
      }[];
    },
  ): Promise<readonly Record<string, unknown>[]> => {
    const records = await listEntityRecords(
      entityRuntime,
      tenantId,
      entityName,
      CHILD_RECORD_PAGE_SIZE,
    );
    return records.filter((record) =>
      evaluateFlatFilters(record, query.filter),
    );
  };
}

function toEntityCatalogEntry(
  entity: ReturnType<EntityRuntimeContext["getEntitiesForTenant"]>[number],
): EntityCatalogEntry {
  return {
    name: entity.name,
    fields: entity.metadata.fields,
    ...(entity.metadata.ui ? { ui: entity.metadata.ui } : {}),
  };
}

export function buildEntityCatalog(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
): readonly EntityCatalogEntry[] {
  return entityRuntime
    .getEntitiesForTenant(tenantId)
    .map((entity) => toEntityCatalogEntry(entity));
}

export function createMetricQueryMembershipResolver(deps: {
  readonly entityRuntime: EntityRuntimeContext;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
}) {
  const queryCache = new Map<
    string,
    Awaited<ReturnType<EntityQueryDefinitionRepository["getById"]>>
  >();

  return async function resolveMetricQueryMembership(input: {
    readonly tenantId: string;
    readonly metric: MetricDefinitionRecord;
    readonly record: Record<string, unknown>;
    readonly evaluatedAt: string;
  }): Promise<boolean> {
    const queryId = input.metric.sourceQueryDefinitionId;
    if (!queryId) {
      return true;
    }

    let definition = queryCache.get(`${input.tenantId}:${queryId}`);
    if (definition === undefined) {
      definition = await resolveEntityQueryDefinitionByReference(
        deps.entityQueryDefinitionRepository,
        input.tenantId,
        queryId,
      );
      queryCache.set(`${input.tenantId}:${queryId}`, definition);
    }

    if (!definition) {
      return false;
    }

    return recordMatchesEntityQueryDefinition({
      record: input.record,
      definition,
      catalog: buildEntityCatalog(deps.entityRuntime, input.tenantId),
      listChildRecords: createListChildRecords(
        deps.entityRuntime,
        input.tenantId,
      ),
      options: { now: new Date(input.evaluatedAt) },
    });
  };
}

export async function listSourceDocumentsForMetricDefinition(
  entityRuntime: EntityRuntimeContext,
  entityQueryDefinitionRepository: EntityQueryDefinitionRepository,
  tenantId: string,
  metric: MetricDefinitionRecord,
): Promise<readonly SourceDocumentSnapshot[]> {
  if (!metric.sourceQueryDefinitionId) {
    return listSourceDocumentsForMetric(
      entityRuntime,
      tenantId,
      metric.sourceModel,
    );
  }

  const definition = await resolveEntityQueryDefinitionByReference(
    entityQueryDefinitionRepository,
    tenantId,
    metric.sourceQueryDefinitionId,
  );
  if (!definition) {
    throw new Error(
      `Unknown source query definition "${metric.sourceQueryDefinitionId}".`,
    );
  }

  const allDocuments = await listSourceDocumentsForMetric(
    entityRuntime,
    tenantId,
    metric.sourceModel,
  );
  const listChildRecords = createListChildRecords(entityRuntime, tenantId);
  const catalog = buildEntityCatalog(entityRuntime, tenantId);
  const matched: SourceDocumentSnapshot[] = [];

  const evaluatedAt = new Date().toISOString();

  for (const document of allDocuments) {
    const included = await recordMatchesEntityQueryDefinition({
      record: document.record,
      definition,
      catalog,
      listChildRecords,
      options: { now: new Date(evaluatedAt) },
    });
    if (included) {
      matched.push(document);
    }
  }

  return matched;
}
