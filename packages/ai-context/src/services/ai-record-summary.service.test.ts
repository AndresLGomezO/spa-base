import { describe, expect, it } from "vitest";

import {
  buildAiRecordSummaryDocId,
  type AiRecordSummaryRecord,
  type AiRecordSummaryRepository,
} from "../storage/ai-record-summary.schema.js";
import {
  invalidateAiRecordNarrativeVariants,
  upsertAiRecordContext,
  upsertAiRecordNarrative,
} from "./ai-record-summary.service.js";
import { isAiRecordNarrativeStale } from "../storage/is-ai-record-narrative-stale.js";

function createRepo(): AiRecordSummaryRepository {
  const store = new Map<string, AiRecordSummaryRecord>();
  const key = (tenantId: string, id: string) => `${tenantId}::${id}`;
  return {
    async get(tenantId, entityName, recordId) {
      return (
        store.get(
          key(tenantId, buildAiRecordSummaryDocId(entityName, recordId)),
        ) ?? null
      );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async getMany(tenantId, refs) {
      const items: AiRecordSummaryRecord[] = [];
      for (const ref of refs) {
        const record = await this.get(tenantId, ref.entityName, ref.recordId);
        if (record) items.push(record);
      }
      return items;
    },
    async upsert(record) {
      store.set(key(record.tenantId, record.id), record);
      return record;
    },
    async delete(tenantId, entityName, recordId) {
      return store.delete(
        key(tenantId, buildAiRecordSummaryDocId(entityName, recordId)),
      );
    },
  };
}

describe("ai-record-summary.service", () => {
  it("marks only the updated narrative variant stale on multi-variant docs", async () => {
    const repository = createRepo();
    const first = await upsertAiRecordContext(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      context: { loans: [{ id: "a" }] },
      narrativeVariant: "loans",
    });
    await upsertAiRecordNarrative(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      variant: "loans",
      text: "loans narrative",
      sourceHash: first.record.contextHash!,
    });
    await upsertAiRecordNarrative(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      variant: "incomes",
      text: "incomes narrative",
      sourceHash: "incomes-hash",
    });
    await repository.upsert({
      ...(await repository.get("t1", "portfolioSettings", "p1"))!,
      variantContextHashes: {
        loans: first.record.contextHash!,
        incomes: "incomes-hash",
      },
    });

    const second = await upsertAiRecordContext(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      context: { loans: [{ id: "a" }, { id: "b" }] },
      narrativeVariant: "loans",
    });

    expect(second.narrativeStale).toBe(true);
    expect(isAiRecordNarrativeStale(second.record, "loans")).toBe(true);
    expect(isAiRecordNarrativeStale(second.record, "incomes")).toBe(false);
  });

  it("invalidates selected portfolio variants without touching siblings", async () => {
    const repository = createRepo();
    const created = await upsertAiRecordContext(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      context: { currencyBase: "COP" },
      narrativeVariant: "default",
    });
    await upsertAiRecordNarrative(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      variant: "default",
      text: "main",
      sourceHash: created.record.contextHash!,
    });
    await upsertAiRecordNarrative(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      variant: "loans",
      text: "loans",
      sourceHash: created.record.contextHash!,
    });
    await upsertAiRecordNarrative(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      variant: "incomes",
      text: "incomes",
      sourceHash: created.record.contextHash!,
    });
    await repository.upsert({
      ...(await repository.get("t1", "portfolioSettings", "p1"))!,
      variantContextHashes: {
        default: created.record.contextHash!,
        loans: created.record.contextHash!,
        incomes: created.record.contextHash!,
      },
    });

    const updated = await invalidateAiRecordNarrativeVariants(repository, {
      tenantId: "t1",
      entityName: "portfolioSettings",
      recordId: "p1",
      variants: ["loans", "default"],
    });

    expect(updated).not.toBeNull();
    expect(isAiRecordNarrativeStale(updated!, "loans")).toBe(true);
    expect(isAiRecordNarrativeStale(updated!, "default")).toBe(true);
    expect(isAiRecordNarrativeStale(updated!, "incomes")).toBe(false);
  });
});
