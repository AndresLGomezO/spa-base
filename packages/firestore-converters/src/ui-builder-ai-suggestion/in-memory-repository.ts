import { nanoid } from "nanoid";

import {
  createUiBuilderSuggestionInputSchema,
  uiBuilderSuggestionRecordSchema,
  type UiBuilderSuggestionRecord,
} from "@repo/ai-engine/schemas";

import type { UiBuilderAiSuggestionRepository } from "./repository-contract.js";

export function createInMemoryUiBuilderAiSuggestionRepository(): UiBuilderAiSuggestionRepository & {
  readonly records: Map<string, UiBuilderSuggestionRecord>;
} {
  const records = new Map<string, UiBuilderSuggestionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    records,
    async create(tenantId, input) {
      const parsed = createUiBuilderSuggestionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `aisug_${nanoid(12)}`;
      const record = uiBuilderSuggestionRecordSchema.parse({
        id,
        tenantId,
        ...parsed,
        createdAt: now,
        updatedAt: now,
      });
      records.set(key(tenantId, id), record);
      return record;
    },
    async getById(tenantId, id) {
      return records.get(key(tenantId, id)) ?? null;
    },
    async listByEntityAndSurface(tenantId, entityName, surface) {
      return [...records.values()]
        .filter(
          (record) =>
            record.tenantId === tenantId &&
            record.entityName === entityName &&
            record.surface === surface,
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
  };
}
