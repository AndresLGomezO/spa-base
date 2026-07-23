import {
  createIndexProvisionEventInputSchema,
  indexProvisionEventRecordSchema,
  type CreateIndexProvisionEventInput,
  type IndexProvisionEventRecord,
} from "@repo/debug-logs";
import { nanoid } from "nanoid";

import { isIsoWithinTimeRange } from "../list-recent-time-range.js";
import type { IndexProvisionEventRepository } from "./repository-contract.js";

const GLOBAL_TENANT_KEY = "__global__";

export function createInMemoryIndexProvisionEventRepository(): IndexProvisionEventRepository & {
  readonly records: IndexProvisionEventRecord[];
} {
  const records: IndexProvisionEventRecord[] = [];

  return {
    records,
    async create(tenantId, input: CreateIndexProvisionEventInput) {
      const parsed = createIndexProvisionEventInputSchema.parse(input);
      const id = `idxevt_${nanoid(12)}`;
      const record = indexProvisionEventRecordSchema.parse({
        id,
        ...parsed,
        ...(tenantId ? { tenantId } : {}),
      });
      records.push(record);
      return record;
    },
    async listRecentForTenant(tenantId, tenantCollections, options) {
      const limit = options?.limit ?? 50;
      const collectionSet = new Set(tenantCollections);
      return records
        .filter((record) => {
          if (record.tenantId === tenantId) {
            return true;
          }
          if (!record.tenantId && collectionSet.has(record.collection)) {
            return true;
          }
          return false;
        })
        .filter((record) => isIsoWithinTimeRange(record.timestamp, options))
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, limit);
    },
  };
}

export function getGlobalIndexProvisionTenantKey(): string {
  return GLOBAL_TENANT_KEY;
}
