import { describe, expect, it } from "vitest";

import {
  deleteAiRecordSummaryTemplate,
  getAiRecordSummaryTemplate,
  upsertAiRecordSummaryTemplate,
} from "./ai-record-summary-template.service.js";
import { AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY } from "../storage/ai-record-summary-template.schema.js";
import {
  type TenantAiContextRecord,
  type TenantAiContextRepository,
} from "../storage/tenant-ai-context.schema.js";
import { buildTenantAiContextDocId } from "../utils/hash.js";

function createMemoryTenantAiContextRepository(): TenantAiContextRepository {
  const store = new Map<string, TenantAiContextRecord>();
  const key = (tenantId: string, id: string) => `${tenantId}::${id}`;
  return {
    async get(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async upsert(record) {
      store.set(key(record.tenantId, record.id), record);
      return record;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
  };
}

describe("deleteAiRecordSummaryTemplate", () => {
  it("removes the template fragment and deletes the doc when empty", async () => {
    const repository = createMemoryTenantAiContextRepository();
    await upsertAiRecordSummaryTemplate(repository, "tenant_a", "deal", {
      textTemplate: "{{name}}",
      jsonFields: ["name"],
      embeddingFields: [],
      piiLevel: {},
    });

    expect(
      await deleteAiRecordSummaryTemplate(repository, "tenant_a", "deal"),
    ).toBe(true);
    expect(
      await getAiRecordSummaryTemplate(repository, "tenant_a", "deal"),
    ).toBeNull();
    expect(
      await repository.get(
        "tenant_a",
        buildTenantAiContextDocId("entity", "deal"),
      ),
    ).toBeNull();
  });

  it("keeps other fragments when clearing the template", async () => {
    const repository = createMemoryTenantAiContextRepository();
    const id = buildTenantAiContextDocId("entity", "deal");
    await repository.upsert({
      id,
      tenantId: "tenant_a",
      kind: "entity",
      scopeKey: "deal",
      sourceHash: "hash",
      fragments: {
        otherFragment: "keep-me",
        [AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY]: JSON.stringify({
          textTemplate: "{{name}}",
          jsonFields: [],
          embeddingFields: [],
          piiLevel: {},
        }),
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(
      await deleteAiRecordSummaryTemplate(repository, "tenant_a", "deal"),
    ).toBe(true);

    const remaining = await repository.get("tenant_a", id);
    expect(remaining?.fragments).toEqual({ otherFragment: "keep-me" });
    expect(
      await getAiRecordSummaryTemplate(repository, "tenant_a", "deal"),
    ).toBeNull();
  });

  it("returns false when no template exists", async () => {
    const repository = createMemoryTenantAiContextRepository();
    expect(
      await deleteAiRecordSummaryTemplate(repository, "tenant_a", "deal"),
    ).toBe(false);
  });
});
