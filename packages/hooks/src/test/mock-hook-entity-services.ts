import { vi } from "vitest";

import type { HookEntityServices } from "../types.js";

export function mockHookEntityServices(
  overrides: Partial<HookEntityServices> = {},
): HookEntityServices {
  const create =
    overrides.create ??
    vi.fn<HookEntityServices["create"]>(async () => ({
      id: "mock_id",
      tenantId: "tenant_a",
    }));

  const createMany =
    overrides.createMany ??
    vi.fn<HookEntityServices["createMany"]>(async (entity, records, options) => {
      const created: Record<string, unknown>[] = [];
      for (const record of records) {
        created.push(await create(entity, record, options));
      }
      return created;
    });

  return {
    create,
    createMany,
    update: overrides.update ?? vi.fn<HookEntityServices["update"]>(),
    list: overrides.list ?? vi.fn<HookEntityServices["list"]>(),
    delete: overrides.delete ?? vi.fn<HookEntityServices["delete"]>(),
    get: overrides.get ?? vi.fn<HookEntityServices["get"]>(),
  };
}
