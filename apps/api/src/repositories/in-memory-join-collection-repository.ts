import { nanoid } from "nanoid";

import type {
  FindJoinBySourceParams,
  FindJoinByTargetParams,
  JoinCollectionRepository,
  JoinRecord,
  LinkJoinParams,
} from "@repo/firestore-converters";

function joinStorageKey(
  tenantId: string,
  joinCollection: string,
  joinId: string,
): string {
  return `${tenantId}:${joinCollection}:${joinId}`;
}

export function createInMemoryJoinCollectionRepository(): JoinCollectionRepository {
  const store = new Map<string, JoinRecord>();

  return {
    async link(tenantId: string, params: LinkJoinParams): Promise<JoinRecord> {
      const existing = [...store.values()].find(
        (record) =>
          record.tenantId === tenantId &&
          record.joinCollection === params.joinCollection &&
          record.sourceEntity === params.sourceEntity &&
          record.sourceId === params.sourceId &&
          record.targetEntity === params.targetEntity &&
          record.targetId === params.targetId,
      );
      if (existing) {
        return existing;
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

      store.set(
        joinStorageKey(tenantId, params.joinCollection, record.id),
        record,
      );
      return record;
    },

    async unlink(
      tenantId: string,
      joinCollection: string,
      joinId: string,
    ): Promise<boolean> {
      return store.delete(joinStorageKey(tenantId, joinCollection, joinId));
    },

    async findBySource(
      tenantId: string,
      params: FindJoinBySourceParams,
    ): Promise<readonly JoinRecord[]> {
      return [...store.values()].filter(
        (record) =>
          record.tenantId === tenantId &&
          record.joinCollection === params.joinCollection &&
          record.sourceEntity === params.sourceEntity &&
          record.sourceId === params.sourceId &&
          record.targetEntity === params.targetEntity,
      );
    },

    async findByTarget(
      tenantId: string,
      params: FindJoinByTargetParams,
    ): Promise<readonly JoinRecord[]> {
      return [...store.values()].filter(
        (record) =>
          record.tenantId === tenantId &&
          record.joinCollection === params.joinCollection &&
          record.targetEntity === params.targetEntity &&
          record.targetId === params.targetId &&
          record.sourceEntity === params.sourceEntity,
      );
    },

    async deleteByEntityId(
      tenantId: string,
      joinCollection: string,
      entityName: string,
      entityId: string,
    ): Promise<number> {
      let deleted = 0;
      for (const [key, record] of store.entries()) {
        if (record.tenantId !== tenantId) continue;
        if (record.joinCollection !== joinCollection) continue;

        const matchesSource =
          record.sourceEntity === entityName && record.sourceId === entityId;
        const matchesTarget =
          record.targetEntity === entityName && record.targetId === entityId;
        if (matchesSource || matchesTarget) {
          store.delete(key);
          deleted += 1;
        }
      }
      return deleted;
    },
  };
}
