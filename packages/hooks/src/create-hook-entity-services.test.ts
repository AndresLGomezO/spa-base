import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createHookEntityServices } from "./create-hook-entity-services.js";

const businessFields = {
  amount: { type: "string" },
  note: { type: "string" },
};

function buildEntityRuntime() {
  const records = new Map<string, Record<string, unknown>>();

  return {
    records,
    entityRuntime: {
      resolveEntity: () => ({
        metadata: { fields: businessFields },
        createSchema: z.object({
          amount: z.string().optional(),
          note: z.string().optional(),
        }),
        updateSchema: z.object({
          amount: z.string().optional(),
          note: z.string().optional(),
        }),
        schema: z.object({
          id: z.string(),
          tenantId: z.string(),
          amount: z.string().optional(),
          note: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
      }),
      getRepository: () => ({
        create: vi.fn(
          async (_tenantId: string, record: Record<string, unknown>) => {
            records.set(record.id as string, record);
            return record;
          },
        ),
        createMany: vi.fn(
          async (
            _tenantId: string,
            batch: readonly Record<string, unknown>[],
          ) => {
            for (const record of batch) {
              records.set(record.id as string, record);
            }
            return [...batch];
          },
        ),
        update: vi.fn(
          async (
            id: string,
            _tenantId: string,
            patch: Record<string, unknown>,
          ) => {
            const existing = records.get(id);
            if (!existing) return null;
            const updated = { ...existing, ...patch };
            records.set(id, updated);
            return updated;
          },
        ),
        findById: vi.fn(async (id: string) => records.get(id) ?? null),
        findByField: vi.fn(async () => ({ items: [], nextCursor: null })),
        delete: vi.fn(async (id: string) => {
          if (!records.has(id)) return false;
          records.delete(id);
          return true;
        }),
      }),
    },
  };
}

const openAccess = {
  hasPermission: () => true,
  resolveFieldAccess: () =>
    Object.fromEntries(
      Object.keys(businessFields).map((name) => [name, "write" as const]),
    ),
  assertWritableFields: () => undefined,
  filterFields: (record: Record<string, unknown>) => record,
};

describe("createHookEntityServices list pagination", () => {
  it("follows nextCursor until the requested limit is satisfied", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      id: `sp_${String(i).padStart(3, "0")}`,
      tenantId: "tenant_a",
      active: true,
      amount: String(i),
    }));
    const page2 = Array.from({ length: 74 }, (_, i) => ({
      id: `sp_${String(i + 100).padStart(3, "0")}`,
      tenantId: "tenant_a",
      active: true,
      amount: String(i + 100),
    }));

    const findByField = vi
      .fn()
      .mockResolvedValueOnce({
        items: page1,
        nextCursor: page1[page1.length - 1]!.id,
      })
      .mockResolvedValueOnce({ items: page2, nextCursor: null });

    const services = createHookEntityServices({
      entityRuntime: {
        resolveEntity: () => ({
          metadata: {
            fields: { ...businessFields, active: { type: "boolean" } },
          },
          createSchema: z.object({}),
          updateSchema: z.object({}),
          schema: z.object({ id: z.string(), tenantId: z.string() }),
        }),
        getRepository: () => ({
          create: vi.fn(),
          createMany: vi.fn(),
          update: vi.fn(),
          findById: vi.fn(),
          findByField,
          delete: vi.fn(),
        }),
      } as never,
      accessControl: {
        ...openAccess,
        resolveFieldAccess: () => ({
          amount: "read",
          note: "read",
          active: "read",
        }),
      },
      tenantId: "tenant_a",
    });

    const listed = await services.list("spendingPattern", {
      field: "active",
      value: true,
      limit: 10_000,
    });

    expect(listed).toHaveLength(174);
    expect(findByField).toHaveBeenCalledTimes(2);
    expect(findByField).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        field: "active",
        value: true,
        limit: 10_000,
      }),
    );
    expect(findByField).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cursor: "sp_099",
        limit: 9_900,
      }),
    );
  });
});

describe("createHookEntityServices onRecordMutated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes onRecordMutated after create, update, and delete", async () => {
    const onRecordMutated = vi.fn(async () => undefined);
    const { entityRuntime, records } = buildEntityRuntime();

    const services = createHookEntityServices({
      entityRuntime: entityRuntime as never,
      accessControl: openAccess,
      tenantId: "tenant_a",
      onRecordMutated,
    });

    const created = await services.create("payment", { amount: "10" });
    expect(onRecordMutated).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant_a",
        entityName: "payment",
        operation: "CREATE",
        documentId: created.id,
        before: null,
      }),
    );

    await services.update("payment", created.id as string, { note: "paid" });
    expect(onRecordMutated).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "UPDATE",
        documentId: created.id,
        after: expect.objectContaining({ note: "paid" }),
      }),
    );

    await services.delete("payment", created.id as string);
    expect(onRecordMutated).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "DELETE",
        documentId: created.id,
        after: null,
      }),
    );
    expect(records.size).toBe(0);
  });

  it("invokes onRecordMutated once per createMany record", async () => {
    const onRecordMutated = vi.fn(async () => undefined);
    const { entityRuntime } = buildEntityRuntime();

    const services = createHookEntityServices({
      entityRuntime: entityRuntime as never,
      accessControl: openAccess,
      tenantId: "tenant_a",
      onRecordMutated,
    });

    const created = await services.createMany("payment", [
      { amount: "1" },
      { amount: "2" },
    ]);

    expect(created).toHaveLength(2);
    expect(onRecordMutated).toHaveBeenCalledTimes(2);
    expect(onRecordMutated).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ operation: "CREATE" }),
    );
    expect(onRecordMutated).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ operation: "CREATE" }),
    );
  });
});
