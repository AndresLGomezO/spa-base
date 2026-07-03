import type {
  EntityCreateOptions,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import type { DocumentData } from "firebase-admin/firestore";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { runFirestoreTransactionWithRetry } from "./firestore-transaction-retry.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FIRESTORE_BATCH_LIMIT = 400;

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function toDocumentData(value: unknown): DocumentData {
  return value as DocumentData;
}

interface EntityConverter<TRecord> {
  read(raw: unknown): TRecord;
  write(domain: unknown): unknown;
}

interface FirestoreAdminEntityRepositoryConfig<
  TRecord extends { readonly id: string; readonly tenantId: string },
> {
  readonly config: FirebaseAdminConfig;
  readonly collection: string;
  readonly converter: EntityConverter<TRecord>;
}

function assertTenantMatch(
  record: { readonly tenantId: string },
  tenantId: string,
): boolean {
  return record.tenantId === tenantId;
}

class FirestoreAdminEntityRepository<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate,
> implements TenantScopedEntityRepository<TRecord, TUpdate> {
  constructor(
    private readonly repositoryConfig: FirestoreAdminEntityRepositoryConfig<TRecord>,
  ) {}

  private getCollection(tenantId: string) {
    const firestore = getFirestoreAdmin(this.repositoryConfig.config);
    return tenantEntityCollectionRef(
      firestore,
      tenantId,
      this.repositoryConfig.collection,
    );
  }

  async create(
    tenantId: string,
    record: TRecord,
    options?: EntityCreateOptions,
  ): Promise<TRecord> {
    if (!assertTenantMatch(record, tenantId)) {
      throw new Error("Record tenantId does not match authenticated tenant.");
    }

    const collectionRef = this.getCollection(tenantId);
    const docRef = collectionRef.doc(record.id);
    if (!options?.skipExistsCheck) {
      const existing = await docRef.get();
      if (existing.exists) {
        throw new Error(`Record already exists: ${record.id}`);
      }
    }

    const persisted = toDocumentData(
      this.repositoryConfig.converter.write(record),
    );
    await docRef.set(persisted);
    return record;
  }

  async createMany(
    tenantId: string,
    records: readonly TRecord[],
  ): Promise<readonly TRecord[]> {
    if (records.length === 0) {
      return [];
    }

    for (const record of records) {
      if (!assertTenantMatch(record, tenantId)) {
        throw new Error("Record tenantId does not match authenticated tenant.");
      }
    }

    const collectionRef = this.getCollection(tenantId);
    const firestore = getFirestoreAdmin(this.repositoryConfig.config);

    for (
      let index = 0;
      index < records.length;
      index += FIRESTORE_BATCH_LIMIT
    ) {
      const batch = firestore.batch();
      for (const record of records.slice(index, index + FIRESTORE_BATCH_LIMIT)) {
        const persisted = toDocumentData(
          this.repositoryConfig.converter.write(record),
        );
        batch.set(collectionRef.doc(record.id), persisted);
      }
      await batch.commit();
    }

    return records;
  }

  async findAll(params: {
    readonly tenantId: string;
    readonly limit?: number;
    readonly cursor?: string;
  }) {
    const limit = normalizeLimit(params.limit);
    const collectionRef = this.getCollection(params.tenantId);

    let query = collectionRef.orderBy("id").limit(limit);
    if (params.cursor) {
      const cursorDoc = await collectionRef.doc(params.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const countSnapshot = await collectionRef.count().get();
    const totalCount = countSnapshot.data().count;

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) =>
      this.repositoryConfig.converter.read(doc.data()),
    );

    const hasMore = items.length === limit;
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

    return {
      items,
      nextCursor,
      totalCount,
    };
  }

  async findByField(params: {
    readonly tenantId: string;
    readonly field: string;
    readonly value: string;
    readonly limit?: number;
    readonly cursor?: string;
  }) {
    const limit = normalizeLimit(params.limit);
    const collectionRef = this.getCollection(params.tenantId);

    let query = collectionRef
      .where(params.field, "==", params.value)
      .orderBy("id")
      .limit(limit);

    if (params.cursor) {
      const cursorDoc = await collectionRef.doc(params.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const countQuery = collectionRef.where(params.field, "==", params.value);
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) =>
      this.repositoryConfig.converter.read(doc.data()),
    );

    const hasMore = items.length === limit;
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

    return {
      items,
      nextCursor,
      totalCount,
    };
  }

  async findById(id: string, tenantId: string): Promise<TRecord | null> {
    const parsedId = id.trim();
    if (!parsedId) return null;

    const snapshot = await this.getCollection(tenantId).doc(parsedId).get();
    if (!snapshot.exists) return null;

    const record = this.repositoryConfig.converter.read(snapshot.data());
    if (!assertTenantMatch(record, tenantId)) {
      return null;
    }

    return record;
  }

  async update(
    id: string,
    tenantId: string,
    data: TUpdate,
  ): Promise<TRecord | null> {
    const parsedId = id.trim();
    if (!parsedId) return null;

    const firestore = getFirestoreAdmin(this.repositoryConfig.config);
    const collectionRef = tenantEntityCollectionRef(
      firestore,
      tenantId,
      this.repositoryConfig.collection,
    );
    const docRef = collectionRef.doc(parsedId);

    return runFirestoreTransactionWithRetry(firestore, async (transaction) => {
      const existingSnapshot = await transaction.get(docRef);
      if (!existingSnapshot.exists) {
        return null;
      }

      const existing = this.repositoryConfig.converter.read(
        existingSnapshot.data(),
      );
      if (!assertTenantMatch(existing, tenantId)) {
        return null;
      }

      const updated = {
        ...existing,
        ...(data as Record<string, unknown>),
        id: existing.id,
        tenantId: existing.tenantId,
      } as TRecord;

      const persisted = toDocumentData(
        this.repositoryConfig.converter.write(updated),
      );
      transaction.set(docRef, persisted, { merge: false });
      return updated;
    });
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const parsedId = id.trim();
    if (!parsedId) return false;

    const docRef = this.getCollection(tenantId).doc(parsedId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return false;
    }

    const record = this.repositoryConfig.converter.read(snapshot.data());
    if (!assertTenantMatch(record, tenantId)) {
      return false;
    }

    await docRef.delete();
    return true;
  }
}

export function createFirestoreAdminEntityRepository<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate = Partial<TRecord>,
>(
  repositoryConfig: FirestoreAdminEntityRepositoryConfig<TRecord>,
): TenantScopedEntityRepository<TRecord, TUpdate> {
  return new FirestoreAdminEntityRepository<TRecord, TUpdate>(repositoryConfig);
}
