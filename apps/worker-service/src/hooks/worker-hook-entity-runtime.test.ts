import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  registerDynamicEntity,
  resolveEntity,
  createEntityConverter,
  createFirestoreAdminEntityRepository,
} = vi.hoisted(() => ({
  registerDynamicEntity: vi.fn(),
  resolveEntity: vi.fn(),
  createEntityConverter: vi.fn(() => ({ write: vi.fn(), read: vi.fn() })),
  createFirestoreAdminEntityRepository: vi.fn(() => ({
    update: vi.fn(),
  })),
}));

vi.mock("@repo/dynamic-entities", () => ({
  registerDynamicEntity,
  resolveEntity,
}));

vi.mock("@repo/entities", () => ({
  getAllEntities: () => [],
}));

vi.mock("@repo/firestore-converters", () => ({
  createEntityConverter,
}));

vi.mock("@repo/gcp-firebase", () => ({
  createFirestoreAdminEntityRepository,
}));

import { WorkerHookEntityRuntime } from "./worker-hook-entity-runtime.js";

describe("WorkerHookEntityRuntime", () => {
  const entityDefinitionRepository = {
    list: vi.fn(async () => [
      { id: "def_1", tenantId: "tenant_a", name: "financialItem" },
    ]),
  };

  const entity = {
    name: "financialItem",
    metadata: { collection: "financialItems" },
  };

  beforeEach(() => {
    registerDynamicEntity.mockClear();
    resolveEntity.mockReset();
    createEntityConverter.mockClear();
    createFirestoreAdminEntityRepository.mockClear();
    entityDefinitionRepository.list.mockClear();
    resolveEntity.mockReturnValue(entity);
  });

  it("invalidates tenant repository cache after reloading entity definitions", async () => {
    const runtime = new WorkerHookEntityRuntime(
      {} as never,
      entityDefinitionRepository as never,
    );

    const first = runtime.getRepository("tenant_a", "financialItem");
    expect(first).toBeDefined();
    expect(createFirestoreAdminEntityRepository).toHaveBeenCalledTimes(1);

    const cached = runtime.getRepository("tenant_a", "financialItem");
    expect(cached).toBe(first);
    expect(createFirestoreAdminEntityRepository).toHaveBeenCalledTimes(1);

    await runtime.ensureTenantEntitiesLoaded("tenant_a");
    expect(registerDynamicEntity).toHaveBeenCalled();

    const rebuilt = runtime.getRepository("tenant_a", "financialItem");
    expect(rebuilt).toBeDefined();
    expect(rebuilt).not.toBe(first);
    expect(createFirestoreAdminEntityRepository).toHaveBeenCalledTimes(2);
  });
});
