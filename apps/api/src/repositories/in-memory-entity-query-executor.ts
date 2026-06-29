import { evaluateFilterTree, applyPostFilterTree } from "@repo/query-engine";
import type {
  EntityQueryExecutor,
  NormalizedEntityQuery,
} from "@repo/firestore-converters";
import { applyPostFilters } from "@repo/query-engine";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function storageKey(tenantId: string, id: string): string {
  return `${tenantId}:${id}`;
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

function sortRecords(
  records: readonly Record<string, unknown>[],
  sort: NormalizedEntityQuery["sort"],
): Record<string, unknown>[] {
  const primarySort = sort ?? { field: "id", direction: "asc" as const };
  const sorted = [...records];

  sorted.sort((left, right) => {
    const primaryComparison =
      primarySort.direction === "asc"
        ? compareValues(left[primarySort.field], right[primarySort.field])
        : compareValues(right[primarySort.field], left[primarySort.field]);

    if (primaryComparison !== 0 || primarySort.field === "id") {
      return primaryComparison;
    }

    return primarySort.direction === "asc"
      ? compareValues(left.id, right.id)
      : compareValues(right.id, left.id);
  });

  return sorted;
}

export function createInMemoryEntityQueryExecutor(
  getStore: () => Map<string, Record<string, unknown>>,
): EntityQueryExecutor {
  return {
    async executeQuery(tenantId, query) {
      const limit = normalizeLimit(query.limit);
      const tenantRecords = [...getStore().values()].filter(
        (record) => record.tenantId === tenantId,
      );

      let filtered = tenantRecords.filter((record) => {
        if (query.filterTree) {
          return evaluateFilterTree(record, query.filterTree);
        }
        return query.filters.every((filter) =>
          evaluateFilterTree(record, {
            type: "condition",
            field: filter.field,
            operator: filter.operator,
            value: filter.value,
          }),
        );
      });

      if (query.postFilterTree) {
        filtered = applyPostFilterTree(filtered, query.postFilterTree);
      }

      const results = applyPostFilters(filtered, query.postFilters);

      const sorted = sortRecords(results, query.sort);
      const totalCount = sorted.length;

      let startIndex = query.offset ?? 0;
      if (query.offset === undefined && query.cursor) {
        const cursorIndex = sorted.findIndex(
          (record) => String(record.id) === query.cursor,
        );
        startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      }

      const page = sorted.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < sorted.length;
      const nextCursor =
        query.offset === undefined && hasMore && page.length > 0
          ? String(page[page.length - 1]!.id)
          : null;

      return {
        items: page,
        nextCursor,
        totalCount,
      };
    },

    async findById(id, tenantId) {
      return getStore().get(storageKey(tenantId, id)) ?? null;
    },
  };
}

export function createInMemoryEntityQueryStore(): Map<
  string,
  Record<string, unknown>
> {
  return new Map<string, Record<string, unknown>>();
}

export function seedInMemoryEntityQueryStore(
  store: Map<string, Record<string, unknown>>,
  records: readonly Record<string, unknown>[],
): void {
  for (const record of records) {
    store.set(storageKey(String(record.tenantId), String(record.id)), record);
  }
}
