import {
  listSearchableStringFields,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import { hasPermission } from "@repo/rbac";
import {
  QueryError,
  QueryErrorCode,
  type QueryEngine,
} from "@repo/query-engine";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface CatalogSearchHit {
  readonly entityName: string;
  readonly entityLabel: string;
  readonly id: string;
  readonly label: string;
  readonly record: Record<string, unknown>;
}

interface CatalogSearchQueryContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly permissions: readonly string[];
  readonly isSuperAdmin?: boolean;
}

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const SEARCH_CONCURRENCY = 5;

function formatEntityLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function resolveCatalogEntityLabel(entity: AnyDefinedEntity): string {
  const navLabel = entity.metadata.ui?.nav?.label?.trim();
  if (navLabel) {
    return navLabel;
  }
  return formatEntityLabel(entity.name);
}

export function formatCatalogRecordLabel(
  record: Record<string, unknown>,
  displayField?: string | null,
): string {
  if (displayField) {
    const value = record[displayField];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  for (const key of ["name", "title", "label", "code"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return String(record.id ?? "");
}

export function scoreCatalogSearchHit(
  hit: CatalogSearchHit,
  query: string,
): number {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  const label = hit.label.toLowerCase();
  if (label === normalized) {
    return 0;
  }
  if (label.startsWith(normalized)) {
    return 1;
  }
  if (label.includes(normalized)) {
    return 2;
  }
  return 3;
}

export function selectSearchableCatalogEntities(options: {
  readonly entities: readonly AnyDefinedEntity[];
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
}): readonly AnyDefinedEntity[] {
  return options.entities.filter((entity) => {
    if (listSearchableStringFields(entity).length === 0) {
      return false;
    }
    return hasPermission(`${entity.name}.read`, options.permissions, {
      isSuperAdmin: options.isSuperAdmin,
    });
  });
}

export function perEntitySearchLimit(
  totalLimit: number,
  entityCount: number,
): number {
  if (entityCount <= 0) {
    return totalLimit;
  }
  return Math.max(1, Math.ceil(totalLimit / entityCount));
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function isSearchNotConfigured(error: unknown): boolean {
  return (
    error instanceof QueryError &&
    error.code === QueryErrorCode.SEARCH_NOT_CONFIGURED
  );
}

export async function runCatalogSearch(options: {
  readonly query: string;
  readonly limit?: number;
  readonly entities: readonly AnyDefinedEntity[];
  readonly queryEngine: QueryEngine;
  readonly context: CatalogSearchQueryContext;
  readonly concurrency?: number;
  readonly enrichRecords?: (
    entityName: string,
    records: readonly Record<string, unknown>[],
  ) => Promise<readonly Record<string, unknown>[]>;
}): Promise<readonly CatalogSearchHit[]> {
  const trimmed = options.query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const searchable = selectSearchableCatalogEntities({
    entities: options.entities,
    permissions: options.context.permissions,
    isSuperAdmin: options.context.isSuperAdmin === true,
  });

  if (searchable.length === 0) {
    return [];
  }

  const entityLimit = perEntitySearchLimit(limit, searchable.length);
  const batches = await mapPool(
    searchable,
    options.concurrency ?? SEARCH_CONCURRENCY,
    async (entity) => {
      try {
        const result = await options.queryEngine.find(
          entity.name,
          {
            search: trimmed,
            pagination: { limit: entityLimit },
          },
          options.context,
        );
        const rawRecords = result.data.map(
          (item) => item as Record<string, unknown>,
        );
        const records = options.enrichRecords
          ? await options.enrichRecords(entity.name, rawRecords)
          : rawRecords;
        const entityLabel = resolveCatalogEntityLabel(entity);
        const hits: CatalogSearchHit[] = [];
        for (const record of records) {
          const id = record.id;
          if (typeof id !== "string" || id.trim().length === 0) {
            continue;
          }
          hits.push({
            entityName: entity.name,
            entityLabel,
            id,
            label: formatCatalogRecordLabel(
              record,
              entity.metadata.displayField,
            ),
            record,
          });
        }
        return hits;
      } catch (error) {
        if (isSearchNotConfigured(error)) {
          return [] as CatalogSearchHit[];
        }
        throw error;
      }
    },
  );

  return batches
    .flat()
    .sort((left, right) => {
      const scoreDiff =
        scoreCatalogSearchHit(left, trimmed) -
        scoreCatalogSearchHit(right, trimmed);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const labelDiff = left.label.localeCompare(right.label);
      if (labelDiff !== 0) {
        return labelDiff;
      }
      return left.entityName.localeCompare(right.entityName);
    })
    .slice(0, limit);
}

export const CATALOG_SEARCH_DEFAULT_LIMIT = DEFAULT_LIMIT;
export const CATALOG_SEARCH_MAX_LIMIT = MAX_LIMIT;
