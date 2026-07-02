import type { FirestoreCompositeIndex } from "@repo/firestore-indexes";
import type {
  EntityQueryExecutor,
  FirestoreNativeOperator,
  NormalizedEntityQuery,
  NormalizedFilter,
} from "@repo/firestore-converters";
import {
  applyPostFilters,
  applyPostFilterTree,
  computeOverfetchLimit,
  decodeCursor,
  encodeCursor,
  evaluateFilterTree,
  QueryError,
  QueryErrorCode,
} from "@repo/query-engine";
import type {
  CollectionReference,
  DocumentData,
  Query,
} from "firebase-admin/firestore";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import type { InMemoryListSnapshotCache } from "./in-memory-list-snapshot-cache.js";
import { buildInMemoryListSnapshotCacheKey } from "./in-memory-list-snapshot-cache.js";
import {
  matchesPlannedIndex,
  queryNeedsClientFallback,
  shouldExecuteInMemoryListQuery,
  usesInMemoryListPipeline,
} from "./query-index-match.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";
import { buildFirestoreCompositeFilter } from "./build-firestore-filter-tree.js";

interface EntityConverter<TRecord> {
  read(raw: unknown): TRecord;
}

export interface FirestoreIndexHint {
  readonly collection: string;
  readonly tenantId: string;
  readonly filters: readonly NormalizedFilter[];
  readonly sort: NormalizedEntityQuery["sort"];
  readonly suggestedFields: readonly string[];
  readonly message: string;
}

interface FirestoreEntityQueryExecutorConfig<
  TRecord extends { readonly id: string; readonly tenantId: string },
> {
  readonly config: FirebaseAdminConfig;
  readonly collection: string;
  readonly converter: EntityConverter<TRecord>;
  readonly onIndexHint?: (hint: FirestoreIndexHint) => void;
  readonly cursorSecret?: string;
  readonly plannedIndexes?: readonly FirestoreCompositeIndex[];
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly clientFallbackMaxDocs?: number;
  readonly inMemoryListSnapshotCache?: InMemoryListSnapshotCache;
}

const EQUALITY_OPERATORS = new Set<FirestoreNativeOperator>([
  "==",
  "in",
  "array-contains",
]);

/** Max rows loaded when search scans a collection (token post-filter; no search index). */
const SEARCH_SCAN_MAX_ITEMS = 500;
const SEARCH_SCAN_PAGE_SIZE = 100;

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

function sortItemsInMemory(
  items: readonly Record<string, unknown>[],
  sort: NormalizedEntityQuery["sort"],
): Record<string, unknown>[] {
  const primarySort = sort ?? { field: "id", direction: "asc" as const };
  const sorted = [...items];

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

function applyFilter(query: Query, filter: NormalizedFilter): Query {
  if (filter.operator === "in") {
    return query.where(filter.field, "in", filter.value as unknown[]);
  }

  return query.where(
    filter.field,
    filter.operator as FirebaseFirestore.WhereFilterOp,
    filter.value,
  );
}

function orderEqualityFiltersForCompositeIndex(
  filters: readonly NormalizedFilter[],
): NormalizedFilter[] {
  const arrayContains = filters.filter(
    (filter) => filter.operator === "array-contains",
  );
  const otherEquality = filters.filter(
    (filter) => filter.operator !== "array-contains",
  );
  return [...arrayContains, ...otherEquality];
}

function buildFirestoreQuery(
  collectionRef: CollectionReference<DocumentData>,
  normalizedQuery: NormalizedEntityQuery,
): Query {
  const equalityFilters = orderEqualityFiltersForCompositeIndex(
    normalizedQuery.filters.filter((filter) =>
      EQUALITY_OPERATORS.has(filter.operator as FirestoreNativeOperator),
    ),
  );
  const inequalityFilters = normalizedQuery.filters.filter(
    (filter) =>
      !EQUALITY_OPERATORS.has(filter.operator as FirestoreNativeOperator),
  );

  let query: Query = collectionRef;

  if (normalizedQuery.filterTree) {
    const compositeFilter = buildFirestoreCompositeFilter(
      normalizedQuery.filterTree,
    );
    if (compositeFilter) {
      query = query.where(compositeFilter);
    }
  } else {
    for (const filter of equalityFilters) {
      query = applyFilter(query, filter);
    }

    for (const filter of inequalityFilters) {
      query = applyFilter(query, filter);
    }
  }

  const primarySort = normalizedQuery.sort ?? { field: "id", direction: "asc" };
  query = query.orderBy(primarySort.field, primarySort.direction);

  if (primarySort.field !== "id") {
    query = query.orderBy("id", primarySort.direction);
  }

  return query;
}

function applyPagination(query: Query, limit: number, offset?: number): Query {
  let paginated = query;
  if (offset !== undefined && offset > 0) {
    paginated = paginated.offset(offset);
  }
  return paginated.limit(limit);
}

function applyUserFilterTreeInMemory(
  items: Record<string, unknown>[],
  filterTree: NormalizedEntityQuery["filterTree"],
): Record<string, unknown>[] {
  if (!filterTree) {
    return items;
  }

  return items.filter((item) => evaluateFilterTree(item, filterTree));
}

function buildSuggestedIndexFields(
  query: NormalizedEntityQuery,
): readonly string[] {
  const fields = new Set<string>();
  for (const filter of query.filters) {
    fields.add(filter.field);
  }
  if (query.sort?.field) {
    fields.add(query.sort.field);
  }
  fields.add("id");
  return [...fields];
}

export function isMissingIndexError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    code === "failed-precondition" ||
    message.includes("FAILED_PRECONDITION") ||
    message.includes("requires an index")
  );
}

function extractIndexLink(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return undefined;
  }
  const message = String(error.message);
  const match = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
  return match?.[0];
}

class FirestoreEntityQueryExecutor<
  TRecord extends { readonly id: string; readonly tenantId: string },
> implements EntityQueryExecutor {
  constructor(
    private readonly executorConfig: FirestoreEntityQueryExecutorConfig<TRecord>,
  ) {}

  private getCollection(tenantId: string) {
    const firestore = getFirestoreAdmin(this.executorConfig.config);
    return tenantEntityCollectionRef(
      firestore,
      tenantId,
      this.executorConfig.collection,
    );
  }

  async executeQuery(tenantId: string, query: NormalizedEntityQuery) {
    const collectionRef = this.getCollection(tenantId);

    const plannedIndexes = this.executorConfig.plannedIndexes ?? [];
    const tenantWideRead = this.executorConfig.tenantWideRead === true;
    const clientFallbackMaxDocs =
      this.executorConfig.clientFallbackMaxDocs ?? 0;
    const inMemoryListQueries =
      this.executorConfig.inMemoryListQueries === true;

    if (
      usesInMemoryListPipeline({
        inMemoryListQueries,
        clientFallbackMaxDocs,
      })
    ) {
      return this.executeInMemoryListQuery(
        tenantId,
        collectionRef,
        query,
        tenantWideRead,
        clientFallbackMaxDocs,
      );
    }

    if (query.search) {
      return this.executeSearchScan(collectionRef, query);
    }

    if (
      shouldExecuteInMemoryListQuery(query, {
        inMemoryListQueries,
        clientFallbackMaxDocs,
      })
    ) {
      return this.executeClientFallback(
        tenantId,
        collectionRef,
        query,
        tenantWideRead,
        clientFallbackMaxDocs,
      );
    }

    if (
      clientFallbackMaxDocs > 0 &&
      plannedIndexes.length > 0 &&
      queryNeedsClientFallback(
        query,
        this.executorConfig.collection,
        plannedIndexes,
        tenantWideRead,
      )
    ) {
      return this.executeClientFallback(
        tenantId,
        collectionRef,
        query,
        tenantWideRead,
        clientFallbackMaxDocs,
      );
    }

    const filteredQuery = buildFirestoreQuery(collectionRef, query);
    const hasPostFilters =
      query.postFilters.length > 0 || query.postFilterTree !== null;
    const fetchLimit = computeOverfetchLimit(query.limit, hasPostFilters);

    try {
      const countSnapshot = await filteredQuery.count().get();
      const totalCount = countSnapshot.data().count;

      let firestoreQuery = applyPagination(
        filteredQuery,
        fetchLimit,
        query.offset,
      );

      if (query.offset === undefined && query.cursor) {
        const secret = this.executorConfig.cursorSecret;
        if (secret) {
          const cursorPayload = decodeCursor(query.cursor, secret);
          const cursorDoc = await collectionRef.doc(cursorPayload.id).get();
          if (cursorDoc.exists) {
            firestoreQuery = firestoreQuery.startAfter(cursorDoc);
          }
        } else {
          const cursorDoc = await collectionRef.doc(query.cursor).get();
          if (cursorDoc.exists) {
            firestoreQuery = firestoreQuery.startAfter(cursorDoc);
          }
        }
      }

      const snapshot = await firestoreQuery.get();
      let items = snapshot.docs.map(
        (doc) =>
          this.executorConfig.converter.read(doc.data()) as Record<
            string,
            unknown
          >,
      );

      if (hasPostFilters) {
        if (query.postFilterTree) {
          items = applyPostFilterTree(items, query.postFilterTree);
        }
        if (query.postFilters.length > 0) {
          items = applyPostFilters(items, query.postFilters);
        }
        items = items.slice(0, query.limit);
      }

      const hasMore =
        query.offset !== undefined
          ? (query.offset ?? 0) + items.length < totalCount
          : hasPostFilters
            ? snapshot.docs.length === fetchLimit
            : items.length === query.limit;

      const sortField = query.sort?.field ?? "id";
      const secret = this.executorConfig.cursorSecret;
      let nextCursor: string | null = null;
      if (query.offset === undefined && hasMore && items.length > 0) {
        const lastItem = items[items.length - 1]!;
        nextCursor = secret
          ? encodeCursor(lastItem, sortField, secret)
          : String(lastItem.id);
      }

      return {
        items,
        nextCursor,
        totalCount: hasPostFilters ? -1 : totalCount,
      };
    } catch (error) {
      if (isMissingIndexError(error)) {
        if (
          clientFallbackMaxDocs > 0 &&
          plannedIndexes.length > 0 &&
          queryNeedsClientFallback(
            query,
            this.executorConfig.collection,
            plannedIndexes,
            tenantWideRead,
          )
        ) {
          return this.executeClientFallback(
            tenantId,
            collectionRef,
            query,
            tenantWideRead,
            clientFallbackMaxDocs,
          );
        }

        const indexLink = extractIndexLink(error);
        this.executorConfig.onIndexHint?.({
          collection: this.executorConfig.collection,
          tenantId,
          filters: query.filters,
          sort: query.sort ?? null,
          suggestedFields: buildSuggestedIndexFields(query),
          message:
            error instanceof Error ? error.message : "Missing Firestore index.",
        });
        throw new QueryError(
          QueryErrorCode.COMPOSITE_INDEX_REQUIRED,
          `This query requires a composite index.${indexLink ? ` Create it here: ${indexLink}` : ""}`,
        );
      }
      throw error;
    }
  }

  private async loadInMemorySnapshot(
    tenantId: string,
    collectionRef: CollectionReference<DocumentData>,
    query: NormalizedEntityQuery,
    tenantWideRead: boolean,
    maxDocs: number,
  ): Promise<Record<string, unknown>[]> {
    const ownershipFilters = tenantWideRead
      ? []
      : query.filters.filter(
          (filter) =>
            filter.field === "accessUserIds" &&
            filter.operator === "array-contains",
        );

    const baselineQuery: NormalizedEntityQuery = {
      filterTree: null,
      filters: ownershipFilters,
      postFilters: [],
      postFilterTree: null,
      sort: { field: "id", direction: "asc" },
      limit: maxDocs,
    };

    const loadFromFirestore = async (): Promise<Record<string, unknown>[]> => {
      const planned = this.executorConfig.plannedIndexes ?? [];
      const canUseBaseline =
        planned.length === 0 ||
        matchesPlannedIndex(this.executorConfig.collection, planned, {
          tenantWideRead,
          equalityFilterFields: [],
          sortField: "id",
          sortDirection: "ASCENDING",
        });

      const readSnapshot = async (
        queryToRun: NormalizedEntityQuery,
      ): Promise<Record<string, unknown>[]> => {
        const snapshot = await buildFirestoreQuery(collectionRef, queryToRun)
          .limit(maxDocs)
          .get();
        return snapshot.docs.map(
          (doc) =>
            this.executorConfig.converter.read(doc.data()) as Record<
              string,
              unknown
            >,
        );
      };

      const ownershipUserId = ownershipFilters.find(
        (filter) =>
          filter.field === "accessUserIds" &&
          filter.operator === "array-contains" &&
          typeof filter.value === "string",
      )?.value;

      try {
        if (canUseBaseline) {
          return await readSnapshot(baselineQuery);
        }
        return await readSnapshot({ ...baselineQuery, filters: [] });
      } catch (error) {
        if (!isMissingIndexError(error)) {
          throw error;
        }

        let items = await readSnapshot({ ...baselineQuery, filters: [] });
        if (
          !tenantWideRead &&
          typeof ownershipUserId === "string" &&
          ownershipUserId.length > 0
        ) {
          items = items.filter((record) => {
            const accessUserIds = record.accessUserIds;
            return (
              Array.isArray(accessUserIds) &&
              accessUserIds.includes(ownershipUserId)
            );
          });
        }
        return items;
      }
    };

    const cache = this.executorConfig.inMemoryListSnapshotCache;
    if (!cache) {
      return loadFromFirestore();
    }

    const cacheKey = buildInMemoryListSnapshotCacheKey({
      tenantId,
      collection: this.executorConfig.collection,
      tenantWideRead,
      query,
    });

    return [...(await cache.getOrLoad(cacheKey, loadFromFirestore))];
  }

  private paginateInMemoryResults(
    items: Record<string, unknown>[],
    query: NormalizedEntityQuery,
  ) {
    const totalCount = items.length;
    const offset = query.offset ?? 0;
    const page = items.slice(offset, offset + query.limit);
    const hasMore = offset + query.limit < totalCount;

    const sortField = query.sort?.field ?? "id";
    const secret = this.executorConfig.cursorSecret;
    let nextCursor: string | null = null;
    if (query.offset === undefined && hasMore && page.length > 0) {
      const lastItem = page[page.length - 1]!;
      nextCursor = secret
        ? encodeCursor(lastItem, sortField, secret)
        : String(lastItem.id);
    }

    return {
      items: page,
      nextCursor,
      totalCount,
    };
  }

  private async executeInMemoryListQuery(
    tenantId: string,
    collectionRef: CollectionReference<DocumentData>,
    query: NormalizedEntityQuery,
    tenantWideRead: boolean,
    maxDocs: number,
  ) {
    let items = await this.loadInMemorySnapshot(
      tenantId,
      collectionRef,
      query,
      tenantWideRead,
      maxDocs,
    );

    items = applyUserFilterTreeInMemory(items, query.filterTree);

    if (query.postFilterTree) {
      items = applyPostFilterTree(items, query.postFilterTree);
    }

    if (query.postFilters.length > 0) {
      items = applyPostFilters(items, query.postFilters);
    }

    items = sortItemsInMemory(items, query.sort);

    return this.paginateInMemoryResults(items, query);
  }

  private async executeClientFallback(
    tenantId: string,
    collectionRef: CollectionReference<DocumentData>,
    query: NormalizedEntityQuery,
    tenantWideRead: boolean,
    maxDocs: number,
  ) {
    let items = await this.loadInMemorySnapshot(
      tenantId,
      collectionRef,
      query,
      tenantWideRead,
      maxDocs,
    );

    items = applyUserFilterTreeInMemory(items, query.filterTree);
    items = sortItemsInMemory(items, query.sort);

    return this.paginateInMemoryResults(items, query);
  }

  async findById(id: string, tenantId: string) {
    const parsedId = id.trim();
    if (!parsedId) return null;

    const snapshot = await this.getCollection(tenantId).doc(parsedId).get();
    if (!snapshot.exists) return null;

    const record = this.executorConfig.converter.read(
      snapshot.data(),
    ) as Record<string, unknown>;

    if (record.tenantId !== tenantId) {
      return null;
    }

    return record;
  }

  private async executeSearchScan(
    collectionRef: CollectionReference<DocumentData>,
    query: NormalizedEntityQuery,
  ) {
    const baseQuery = buildFirestoreQuery(collectionRef, query);
    let items: Record<string, unknown>[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    while (items.length < SEARCH_SCAN_MAX_ITEMS) {
      const remaining = SEARCH_SCAN_MAX_ITEMS - items.length;
      const pageSize = Math.min(SEARCH_SCAN_PAGE_SIZE, remaining);
      let pageQuery = baseQuery.limit(pageSize);

      if (lastDoc) {
        pageQuery = pageQuery.startAfter(lastDoc);
      }

      const snapshot = await pageQuery.get();
      if (snapshot.empty) {
        break;
      }

      items.push(
        ...snapshot.docs.map(
          (doc) =>
            this.executorConfig.converter.read(doc.data()) as Record<
              string,
              unknown
            >,
        ),
      );

      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.docs.length < pageSize) {
        break;
      }
    }

    items = applyPostFilters(items, query.postFilters);
    const sorted = sortItemsInMemory(items, query.sort);
    const totalCount = sorted.length;

    let startIndex = query.offset ?? 0;
    if (query.offset === undefined && query.cursor) {
      const cursorIndex = sorted.findIndex(
        (record) => String(record.id) === query.cursor,
      );
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const page = sorted.slice(startIndex, startIndex + query.limit);
    const hasMore = startIndex + query.limit < sorted.length;
    const sortField = query.sort?.field ?? "id";
    const secret = this.executorConfig.cursorSecret;
    let nextCursor: string | null = null;
    if (query.offset === undefined && hasMore && page.length > 0) {
      const lastItem = page[page.length - 1]!;
      nextCursor = secret
        ? encodeCursor(lastItem, sortField, secret)
        : String(lastItem.id);
    }

    return {
      items: page,
      nextCursor,
      totalCount,
    };
  }
}

export function createFirestoreEntityQueryExecutor<
  TRecord extends { readonly id: string; readonly tenantId: string },
>(
  executorConfig: FirestoreEntityQueryExecutorConfig<TRecord>,
): EntityQueryExecutor {
  return new FirestoreEntityQueryExecutor<TRecord>(executorConfig);
}
