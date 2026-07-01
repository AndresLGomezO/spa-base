import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { buildRoleCatalog, createHookEntityAccessControl } from "@repo/rbac";
import { defineEntityFromRecord } from "@repo/dynamic-entities";
import {
  clearHookRegistry,
  registerDynamicHook,
  type DataHookDefinition,
} from "@repo/hooks";

import { createHookEntityServices } from "./create-hook-services.js";
import { dispatchChainedEntityHooks } from "./dispatch-chained-entity-hooks.js";

const paymentHook: DataHookDefinition = {
  id: "hook_payment",
  tenantId: "tenant_a",
  name: "Tag payment",
  entity: "payment",
  phase: "before",
  trigger: { operation: "create" },
  actions: [
    {
      type: "setField",
      field: "note",
      value: { kind: "literal", value: "from payment hook" },
    },
  ],
  enabled: true,
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const businessFields = { loanId: { type: "string" }, note: { type: "string" } };

function buildEntityRuntime() {
  const records = new Map<string, Record<string, unknown>>();

  return {
    records,
    entityRuntime: {
      resolveEntity: () => ({
        metadata: { fields: businessFields },
        createSchema: z.object({
          loanId: z.string().optional(),
          note: z.string().optional(),
        }),
        updateSchema: z.object({
          loanId: z.string().optional(),
          note: z.string().optional(),
        }),
        schema: z.object({
          id: z.string(),
          tenantId: z.string(),
          loanId: z.string().optional(),
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
        update: vi.fn(),
        findById: vi.fn(),
        findByField: vi.fn(async () => ({ items: [] })),
        delete: vi.fn(async () => true),
      }),
    },
  };
}

describe("createHookEntityServices chained writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearHookRegistry();
  });

  it("dispatches before and after hooks when chainHooks is enabled", async () => {
    registerDynamicHook("tenant_a", paymentHook);
    const { entityRuntime, records } = buildEntityRuntime();

    const services = createHookEntityServices({
      entityRuntime: entityRuntime as never,
      accessControl: createHookEntityAccessControl({
        permissions: ["payment.create", "payment.read"],
        isSuperAdmin: true,
        tenantId: "tenant_a",
      }),
      tenantId: "tenant_a",
      dispatchChainedHooks: (params) =>
        dispatchChainedEntityHooks({
          tenantId: "tenant_a",
          entityName: params.entityName,
          phase: params.phase,
          operation: params.operation,
          current: params.current,
          depth: params.depth,
          visitedHookIds: params.visitedHookIds,
          user: { uid: "user_1" },
          logger: {
            info: vi.fn(),
            error: vi.fn(),
          },
          entityServices: services,
        }),
    });

    const created = await services.create(
      "payment",
      { loanId: "loan_1" },
      { chainHooks: true, depth: 0, visitedHookIds: new Set(["hook_loan"]) },
    );

    expect(created.note).toBe("from payment hook");
    expect([...records.values()][0]?.note).toBe("from payment hook");
  });

  it("writes directly when chainHooks is disabled", async () => {
    const { entityRuntime } = buildEntityRuntime();
    const dispatch = vi.fn();

    const services = createHookEntityServices({
      entityRuntime: entityRuntime as never,
      accessControl: createHookEntityAccessControl({
        permissions: ["payment.create", "payment.read"],
        isSuperAdmin: true,
        tenantId: "tenant_a",
      }),
      tenantId: "tenant_a",
      dispatchChainedHooks: dispatch,
    });

    await services.create("payment", { loanId: "loan_1" });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("persists chained creates with strict dynamic entity schemas", async () => {
    registerDynamicHook("tenant_a", paymentHook);
    const paymentEntity = defineEntityFromRecord({
      id: "def_payment",
      tenantId: "tenant_a",
      name: "payment",
      label: "Payment",
      version: 1,
      fields: [
        { name: "loanId", type: "string", required: false },
        { name: "note", type: "string", required: false },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const records = new Map<string, Record<string, unknown>>();

    const services = createHookEntityServices({
      entityRuntime: {
        resolveEntity: () => paymentEntity,
        getRepository: () => ({
          create: vi.fn(
            async (_tenantId: string, record: Record<string, unknown>) => {
              records.set(record.id as string, record);
              return record;
            },
          ),
          update: vi.fn(),
          findById: vi.fn(),
          findByField: vi.fn(async () => ({ items: [] })),
          delete: vi.fn(async () => true),
        }),
      } as never,
      accessControl: createHookEntityAccessControl({
        permissions: ["payment.create", "payment.read"],
        isSuperAdmin: false,
        tenantId: "tenant_a",
        roleCatalog: buildRoleCatalog([]),
        knownPermissions: ["payment.create", "payment.read", "payment.update"],
        platformRole: null,
        tenantRoleNames: ["admin"],
      }),
      tenantId: "tenant_a",
      dispatchChainedHooks: (params) =>
        dispatchChainedEntityHooks({
          tenantId: "tenant_a",
          entityName: params.entityName,
          phase: params.phase,
          operation: params.operation,
          current: params.current,
          depth: params.depth,
          visitedHookIds: params.visitedHookIds,
          user: { uid: "user_1" },
          logger: {
            info: vi.fn(),
            error: vi.fn(),
          },
          entityServices: services,
        }),
    });

    const created = await services.create(
      "payment",
      { loanId: "loan_1" },
      { chainHooks: true, depth: 0, visitedHookIds: new Set(["hook_loan"]) },
    );

    expect(created.note).toBe("from payment hook");
    expect(records.size).toBe(1);
  });

  it("deletes a record when delete permission is granted", async () => {
    const repository = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(async () => ({
        id: "pay_1",
        tenantId: "tenant_a",
        loanId: "loan_1",
      })),
      findByField: vi.fn(async () => ({ items: [] })),
      delete: vi.fn(async () => true),
    };
    const entityRuntime = {
      resolveEntity: () => ({
        metadata: { fields: businessFields },
        createSchema: z.object({
          loanId: z.string().optional(),
          note: z.string().optional(),
        }),
        updateSchema: z.object({
          loanId: z.string().optional(),
          note: z.string().optional(),
        }),
        schema: z.object({
          id: z.string(),
          tenantId: z.string(),
          loanId: z.string().optional(),
          note: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
      }),
      getRepository: () => repository,
    };

    const services = createHookEntityServices({
      entityRuntime: entityRuntime as never,
      accessControl: createHookEntityAccessControl({
        permissions: ["payment.delete"],
        isSuperAdmin: true,
        tenantId: "tenant_a",
      }),
      tenantId: "tenant_a",
    });

    const deleted = await services.delete("payment", "pay_1");

    expect(deleted).toBe(true);
    expect(repository.delete).toHaveBeenCalledWith("pay_1", "tenant_a");
  });

  it("reads a record when read permission is granted", async () => {
    const repository = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(async () => ({
        id: "pay_1",
        tenantId: "tenant_a",
        loanId: "loan_1",
        note: "secret",
      })),
      findByField: vi.fn(async () => ({ items: [] })),
      delete: vi.fn(async () => true),
    };
    const entityRuntime = {
      resolveEntity: () => ({
        metadata: { fields: businessFields },
        createSchema: z.object({
          loanId: z.string().optional(),
          note: z.string().optional(),
        }),
        updateSchema: z.object({
          loanId: z.string().optional(),
          note: z.string().optional(),
        }),
        schema: z.object({
          id: z.string(),
          tenantId: z.string(),
          loanId: z.string().optional(),
          note: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
      }),
      getRepository: () => repository,
    };

    const services = createHookEntityServices({
      entityRuntime: entityRuntime as never,
      accessControl: createHookEntityAccessControl({
        permissions: ["payment.read"],
        isSuperAdmin: true,
        tenantId: "tenant_a",
      }),
      tenantId: "tenant_a",
    });

    const record = await services.get("payment", "pay_1");

    expect(record.id).toBe("pay_1");
    expect(record.loanId).toBe("loan_1");
    expect(repository.findById).toHaveBeenCalledWith("pay_1", "tenant_a");
  });

  it("rejects get when read permission is missing", async () => {
    const { entityRuntime } = buildEntityRuntime();
    const services = createHookEntityServices({
      entityRuntime: entityRuntime as never,
      accessControl: createHookEntityAccessControl({
        permissions: ["payment.create"],
        isSuperAdmin: false,
        tenantId: "tenant_a",
      }),
      tenantId: "tenant_a",
    });

    await expect(services.get("payment", "pay_1")).rejects.toThrow(
      /permission to read/,
    );
  });
});
