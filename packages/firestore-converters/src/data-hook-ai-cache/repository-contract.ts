export {
  DATA_HOOK_AI_CACHE_COLLECTION,
  dataHookAiCacheDocId,
  dataHookAiCacheRecordSchema,
  type DataHookAiCacheRecord,
} from "@repo/ai-engine/schemas";

import type { DataHookAiCacheRecord } from "@repo/ai-engine/schemas";

export interface DataHookAiCacheRepository {
  getById(
    tenantId: string,
    id: string,
  ): Promise<DataHookAiCacheRecord | null>;
  upsert(record: DataHookAiCacheRecord): Promise<DataHookAiCacheRecord>;
}
