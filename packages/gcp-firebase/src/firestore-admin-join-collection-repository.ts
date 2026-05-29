import type {
  FindJoinBySourceParams,
  FindJoinByTargetParams,
  JoinCollectionRepository,
  JoinRecord,
  LinkJoinParams,
} from "@repo/firestore-converters";
import type {
  DocumentData,
  DocumentReference,
} from "firebase-admin/firestore";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

interface FirestoreJoinCollectionRepositoryConfig {
  readonly config: FirebaseAdminConfig;
}

function toDocumentData(value: unknown): DocumentData {
  return value as DocumentData;
}

function readJoinRecord(raw: DocumentData, joinCollection: string): JoinRecord {
  return {
    id: String(raw.id),
    tenantId: String(raw.tenantId),
    joinCollection,
    sourceEntity: String(raw.sourceEntity),
    sourceId: String(raw.sourceId),
    targetEntity: String(raw.targetEntity),
    targetId: String(raw.targetId),
    createdAt: String(raw.createdAt),
  };
}

class FirestoreJoinCollectionRepository implements JoinCollectionRepository {
  constructor(
    private readonly repositoryConfig: FirestoreJoinCollectionRepositoryConfig,
  ) {}

  private getCollection(tenantId: string, joinCollection: string) {
    const firestore = getFirestoreAdmin(this.repositoryConfig.config);
    return tenantEntityCollectionRef(firestore, tenantId, joinCollection);
  }

  async link(tenantId: string, params: LinkJoinParams): Promise<JoinRecord> {
    const collectionRef = this.getCollection(tenantId, params.joinCollection);
    const existingSnapshot = await collectionRef
      .where("sourceEntity", "==", params.sourceEntity)
      .where("sourceId", "==", params.sourceId)
      .where("targetEntity", "==", params.targetEntity)
      .where("targetId", "==", params.targetId)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return readJoinRecord(
        existingSnapshot.docs[0]!.data(),
        params.joinCollection,
      );
    }

    const record: JoinRecord = {
      id: nanoid(),
      tenantId,
      joinCollection: params.joinCollection,
      sourceEntity: params.sourceEntity,
      sourceId: params.sourceId,
      targetEntity: params.targetEntity,
      targetId: params.targetId,
      createdAt: new Date().toISOString(),
    };

    await collectionRef.doc(record.id).set(toDocumentData(record));
    return record;
  }

  async unlink(
    tenantId: string,
    joinCollection: string,
    joinId: string,
  ): Promise<boolean> {
    const docRef = this.getCollection(tenantId, joinCollection).doc(joinId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return false;
    }

    await docRef.delete();
    return true;
  }

  async findBySource(
    tenantId: string,
    params: FindJoinBySourceParams,
  ): Promise<readonly JoinRecord[]> {
    const snapshot = await this.getCollection(tenantId, params.joinCollection)
      .where("sourceEntity", "==", params.sourceEntity)
      .where("sourceId", "==", params.sourceId)
      .where("targetEntity", "==", params.targetEntity)
      .get();

    return snapshot.docs.map((doc) =>
      readJoinRecord(doc.data(), params.joinCollection),
    );
  }

  async findByTarget(
    tenantId: string,
    params: FindJoinByTargetParams,
  ): Promise<readonly JoinRecord[]> {
    const snapshot = await this.getCollection(tenantId, params.joinCollection)
      .where("targetEntity", "==", params.targetEntity)
      .where("targetId", "==", params.targetId)
      .where("sourceEntity", "==", params.sourceEntity)
      .get();

    return snapshot.docs.map((doc) =>
      readJoinRecord(doc.data(), params.joinCollection),
    );
  }

  async deleteByEntityId(
    tenantId: string,
    joinCollection: string,
    entityName: string,
    entityId: string,
  ): Promise<number> {
    const collectionRef = this.getCollection(tenantId, joinCollection);
    const [sourceSnapshot, targetSnapshot] = await Promise.all([
      collectionRef
        .where("sourceEntity", "==", entityName)
        .where("sourceId", "==", entityId)
        .get(),
      collectionRef
        .where("targetEntity", "==", entityName)
        .where("targetId", "==", entityId)
        .get(),
    ]);

    const docRefs = new Map<string, DocumentReference>();
    for (const doc of sourceSnapshot.docs) {
      docRefs.set(doc.id, doc.ref);
    }
    for (const doc of targetSnapshot.docs) {
      docRefs.set(doc.id, doc.ref);
    }

    await Promise.all([...docRefs.values()].map((docRef) => docRef.delete()));
    return docRefs.size;
  }
}

export function createFirestoreAdminJoinCollectionRepository(
  config: FirebaseAdminConfig,
): JoinCollectionRepository {
  return new FirestoreJoinCollectionRepository({ config });
}
