import {
  evaluateEntityQueryFilterTree,
  recordMatchesEntityQueryDefinition,
  type EntityCatalogEntry,
  type EntityQueryFilterOperator,
} from "@repo/entity-queries";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import type { MetricQueryMembershipResolver } from "@repo/aggregation-engine";
import type { MetricDefinitionRecord } from "@repo/metrics-engine";
import type {
  EntityDefinitionRepository,
  EntityQueryDefinitionRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import { createEntityConverter } from "@repo/firestore-converters";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";
import {
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminEntityRepository,
} from "@repo/gcp-firebase";

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

function toCatalogEntry(
  definition: NonNullable<
    Awaited<ReturnType<EntityDefinitionRepository["getByName"]>>
  >,
): EntityCatalogEntry {
  const entity = defineEntityFromRecord(definition);
  return {
    name: entity.name,
    fields: entity.metadata.fields,
    ...(entity.metadata.ui ? { ui: entity.metadata.ui } : {}),
  };
}

export function createWorkerMetricQueryMembershipResolver(
  config: FirebaseAdminConfig,
): MetricQueryMembershipResolver {
  const entityDefinitionRepository =
    createFirestoreAdminEntityDefinitionRepository(config);
  const entityQueryDefinitionRepository =
    createFirestoreAdminEntityQueryDefinitionRepository(config);
  const repositoryCache = new Map<
    string,
    TenantScopedEntityRepository<{
      readonly id: string;
      readonly tenantId: string;
    }>
  >();
  const catalogCache = new Map<string, readonly EntityCatalogEntry[]>();
  const queryCache = new Map<
    string,
    Awaited<ReturnType<EntityQueryDefinitionRepository["getById"]>>
  >();

  async function loadCatalog(
    tenantId: string,
  ): Promise<readonly EntityCatalogEntry[]> {
    const cached = catalogCache.get(tenantId);
    if (cached) {
      return cached;
    }

    const definitions = await entityDefinitionRepository.list(tenantId);
    const catalog = definitions.map((definition) => toCatalogEntry(definition));
    catalogCache.set(tenantId, catalog);
    return catalog;
  }

  async function getRepository(
    tenantId: string,
    entityName: string,
  ): Promise<TenantScopedEntityRepository<{
    readonly id: string;
    readonly tenantId: string;
  }> | null> {
    const key = `${tenantId}:${entityName}`;
    const cached = repositoryCache.get(key);
    if (cached) {
      return cached;
    }

    const definition = await entityDefinitionRepository.getByName(
      tenantId,
      entityName,
    );
    if (!definition) {
      return null;
    }

    const entity = defineEntityFromRecord(definition);
    const repository = createFirestoreAdminEntityRepository({
      config,
      collection: entity.metadata.collection,
      converter: createEntityConverter(entity),
      ...(entity.metadata.tenantWideRead ? { tenantWideRead: true } : {}),
    });
    repositoryCache.set(key, repository);
    return repository;
  }

  async function listEntityRecords(
    tenantId: string,
    entityName: string,
    maxItems: number,
  ): Promise<readonly Record<string, unknown>[]> {
    const repository = await getRepository(tenantId, entityName);
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

    const cacheKey = `${input.tenantId}:${queryId}`;
    let definition = queryCache.get(cacheKey);
    if (definition === undefined) {
      definition = await entityQueryDefinitionRepository.getById(
        input.tenantId,
        queryId,
      );
      queryCache.set(cacheKey, definition);
    }

    if (!definition) {
      return false;
    }

    const catalog = await loadCatalog(input.tenantId);
    return recordMatchesEntityQueryDefinition({
      record: input.record,
      definition,
      catalog,
      listChildRecords: async (entityName, query) => {
        const records = await listEntityRecords(
          input.tenantId,
          entityName,
          CHILD_RECORD_PAGE_SIZE,
        );
        return records.filter((record) =>
          evaluateFlatFilters(record, query.filter),
        );
      },
      options: { now: new Date(input.evaluatedAt) },
    });
  };
}
