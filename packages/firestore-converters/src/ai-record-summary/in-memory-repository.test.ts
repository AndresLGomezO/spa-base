import { describe, expect, it } from "vitest";

import { buildAiRecordSummaryDocId } from "./repository-contract.js";
import { createInMemoryAiRecordSummaryRepository } from "./in-memory-repository.js";

describe("createInMemoryAiRecordSummaryRepository", () => {
  it("upserts and gets by entityName/recordId", async () => {
    const repo = createInMemoryAiRecordSummaryRepository();
    const now = "2026-01-01T00:00:00.000Z";
    const saved = await repo.upsert({
      id: buildAiRecordSummaryDocId("financialItem", "loan_1"),
      tenantId: "tenant_a",
      entityName: "financialItem",
      recordId: "loan_1",
      accessUserIds: ["user_1"],
      tenantWideRead: false,
      context: { name: "Hipoteca" },
      contextHash: "abc",
      narratives: {},
      createdAt: now,
      updatedAt: now,
    });

    expect(saved.id).toBe("financialItem__loan_1");
    expect(await repo.get("tenant_a", "financialItem", "loan_1")).toEqual(
      saved,
    );
    expect(
      await repo.getMany("tenant_a", [
        { entityName: "financialItem", recordId: "loan_1" },
        { entityName: "financialItem", recordId: "missing" },
      ]),
    ).toHaveLength(1);
  });

  it("deletes by entityName/recordId", async () => {
    const repo = createInMemoryAiRecordSummaryRepository();
    const now = "2026-01-01T00:00:00.000Z";
    await repo.upsert({
      id: buildAiRecordSummaryDocId("financialItem", "loan_1"),
      tenantId: "tenant_a",
      entityName: "financialItem",
      recordId: "loan_1",
      accessUserIds: [],
      tenantWideRead: true,
      narratives: {},
      createdAt: now,
      updatedAt: now,
    });
    expect(await repo.delete("tenant_a", "financialItem", "loan_1")).toBe(true);
    expect(await repo.get("tenant_a", "financialItem", "loan_1")).toBeNull();
  });
});
