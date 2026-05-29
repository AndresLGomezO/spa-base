import type {
  EntityQueryExecutor,
  FilterOperator,
  NormalizedEntityQuery,
  NormalizedFilter,
} from "@repo/firestore-converters";
import type {
  CollectionReference,
  DocumentData,
  Query,
} from "firebase-admin/firestore";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

interface EntityConverter<TRecord> {
  read(raw: unknown): TRecord;
}

interface FirestoreEntityQueryExecutorConfig<
  TRecord extends { readonly id: string; readonly tenantId: string },
> {
  readonly config: FirebaseAdminConfig;
  readonly collection: string;
  readonly converter: EntityConverter<TRecord>;
}

const EQUALITY_OPERATORS = new Set<FilterOperator>([
  "==",
  "in",
  "array-contains",
]);

function applyFilter(query: Query, filter: NormalizedFilter): Query {
  if (filter.operator === "in") {
    return query.where(filter.field, "in", filter.value as unknown[]);
  }

  return query.where(filter.field, filter.operator, filter.value);
}

function buildFirestoreQuery(
  collectionRef: CollectionReference<DocumentData>,
  normalizedQuery: NormalizedEntityQuery,
): Query {
  const equalityFilters = normalizedQuery.filters.filter((filter) =>
    EQUALITY_OPERATORS.has(filter.operator),
  );
  const inequalityFilters = normalizedQuery.filters.filter(
    (filter) => !EQUALITY_OPERATORS.has(filter.operator),
  );

  let query: Query = collectionRef;

  for (const filter of equalityFilters) {
    query = applyFilter(query, filter);
  }

  for (const filter of inequalityFilters) {
    query = applyFilter(query, filter);
  }

  const primarySort = normalizedQuery.sort ?? { field: "id", direction: "asc" };
  query = query.orderBy(primarySort.field, primarySort.direction);

  if (primarySort.field !== "id") {
    query = query.orderBy("id", primarySort.direction);
  }

  return query.limit(normalizedQuery.limit);
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
    let firestoreQuery = buildFirestoreQuery(collectionRef, query);

    if (query.cursor) {
      const cursorDoc = await collectionRef.doc(query.cursor).get();
      if (cursorDoc.exists) {
        firestoreQuery = firestoreQuery.startAfter(cursorDoc);
      }
    }

    const snapshot = await firestoreQuery.get();
    const items = snapshot.docs.map(
      (doc) =>
        this.executorConfig.converter.read(doc.data()) as Record<
          string,
          unknown
        >,
    );

    const hasMore = items.length === query.limit;
    const nextCursor =
      hasMore && items.length > 0 ? String(items[items.length - 1]!.id) : null;

    return {
      items,
      nextCursor,
    };
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
}

export function createFirestoreEntityQueryExecutor<
  TRecord extends { readonly id: string; readonly tenantId: string },
>(
  executorConfig: FirestoreEntityQueryExecutorConfig<TRecord>,
): EntityQueryExecutor {
  return new FirestoreEntityQueryExecutor<TRecord>(executorConfig);
}
