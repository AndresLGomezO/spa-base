import { describe, expect, it } from "vitest";

import { createInMemoryEntityRepository } from "./in-memory-entity-repository.js";

interface TestRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function makeRecord(id: string, tenantId: string, name: string): TestRecord {
  const now = new Date().toISOString();
  return { id, tenantId, name, createdAt: now, updatedAt: now };
}

describe("createInMemoryEntityRepository", () => {
  it("creates and finds a record within the same tenant", async () => {
    const repo = createInMemoryEntityRepository<TestRecord>();
    const record = makeRecord("1", "tenant_a", "Acme");

    await repo.create("tenant_a", record);
    const found = await repo.findById("1", "tenant_a");

    expect(found).toEqual(record);
  });

  it("isolates tenants on read", async () => {
    const repo = createInMemoryEntityRepository<TestRecord>({
      initialData: [makeRecord("1", "tenant_a", "Acme")],
    });

    expect(await repo.findById("1", "tenant_b")).toBeNull();
  });

  it("isolates tenants on update and delete", async () => {
    const repo = createInMemoryEntityRepository<TestRecord>({
      initialData: [makeRecord("1", "tenant_a", "Acme")],
    });

    expect(await repo.update("1", "tenant_b", { name: "Hacked" })).toBeNull();
    expect(await repo.delete("1", "tenant_b")).toBe(false);
    expect(await repo.findById("1", "tenant_a")).not.toBeNull();
  });

  it("updates a record for the matching tenant", async () => {
    const repo = createInMemoryEntityRepository<TestRecord>({
      initialData: [makeRecord("1", "tenant_a", "Acme")],
    });

    const updated = await repo.update("1", "tenant_a", {
      name: "Acme Updated",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(updated?.name).toBe("Acme Updated");
    expect(updated?.tenantId).toBe("tenant_a");
  });

  it("deletes a record for the matching tenant", async () => {
    const repo = createInMemoryEntityRepository<TestRecord>({
      initialData: [makeRecord("1", "tenant_a", "Acme")],
    });

    expect(await repo.delete("1", "tenant_a")).toBe(true);
    expect(await repo.findById("1", "tenant_a")).toBeNull();
  });

  it("paginates list results with limit and cursor", async () => {
    const repo = createInMemoryEntityRepository<TestRecord>({
      initialData: [
        makeRecord("1", "tenant_a", "One"),
        makeRecord("2", "tenant_a", "Two"),
        makeRecord("3", "tenant_a", "Three"),
        makeRecord("9", "tenant_b", "Other tenant"),
      ],
    });

    const firstPage = await repo.findAll({ tenantId: "tenant_a", limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items[0]?.id).toBe("1");
    expect(firstPage.nextCursor).toBe("2");

    const secondPage = await repo.findAll({
      tenantId: "tenant_a",
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.id).toBe("3");
    expect(secondPage.nextCursor).toBeNull();
  });
});
