import { defineEntity, type DefinedEntity, type FieldDefinitions } from "@repo/entities";
import type {
  FindByFieldParams,
  JoinCollectionRepository,
  ListParams,
  PaginatedResult,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import { nanoid } from "nanoid";
import { describe, expect, it } from "vitest";

import {
  createJoinCollectionHandler,
  createRelationDeleteHandler,
  createRelationValidator,
  RelationError,
  RelationErrorCode,
} from "./index.js";
import type { RelationServicesDeps } from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Customer = defineEntity({
  name: "customer",
  fields: {
    name: { type: "string", required: true },
  },
});

const Order = defineEntity({
  name: "order",
  fields: {
    orderNumber: { type: "string", required: true },
    customerId: {
      type: "relation",
      required: true,
      relation: {
        target: "customer",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
  },
});

const User = defineEntity({
  name: "user",
  fields: {
    name: { type: "string", required: true },
    projects: {
      type: "relation",
      relation: {
        target: "project",
        type: "many-to-many",
        joinCollection: "user_projects",
      },
    },
  },
});

const Project = defineEntity({
  name: "project",
  fields: {
    title: { type: "string", required: true },
  },
});

type TestRecord = Record<string, unknown> & { id: string; tenantId: string };

function createMemoryEntityRepository(): TenantScopedEntityRepository<TestRecord> {
  const store = new Map<string, TestRecord>();

  return {
    async create(tenantId, record) {
      store.set(`${tenantId}:${record.id}`, record);
      return record;
    },
    async findAll(params: ListParams): Promise<PaginatedResult<TestRecord>> {
      const items = [...store.values()].filter(
        (record) => record.tenantId === params.tenantId,
      );
      return { items, nextCursor: null };
    },
    async findByField(params: FindByFieldParams): Promise<PaginatedResult<TestRecord>> {
      const items = [...store.values()].filter(
        (record) =>
          record.tenantId === params.tenantId &&
          String(record[params.field]) === params.value,
      );
      return { items, nextCursor: null };
    },
    async findById(id, tenantId) {
      return store.get(`${tenantId}:${id}`) ?? null;
    },
    async update(id, tenantId, data) {
      const existing = store.get(`${tenantId}:${id}`);
      if (!existing) return null;
      const updated = { ...existing, ...data, id: existing.id, tenantId };
      store.set(`${tenantId}:${id}`, updated);
      return updated;
    },
    async delete(id, tenantId) {
      return store.delete(`${tenantId}:${id}`);
    },
  };
}

function createMemoryJoinRepository(): JoinCollectionRepository {
  const store = new Map<string, Record<string, unknown>>();

  return {
    async link(tenantId, params) {
      const record = {
        id: nanoid(),
        tenantId,
        joinCollection: params.joinCollection,
        sourceEntity: params.sourceEntity,
        sourceId: params.sourceId,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        createdAt: new Date().toISOString(),
      };
      store.set(`${tenantId}:${params.joinCollection}:${record.id}`, record);
      return record as never;
    },
    async unlink(tenantId, joinCollection, joinId) {
      return store.delete(`${tenantId}:${joinCollection}:${joinId}`);
    },
    async findBySource(tenantId, params) {
      return [...store.values()].filter(
        (record) =>
          record.tenantId === tenantId &&
          record.joinCollection === params.joinCollection &&
          record.sourceEntity === params.sourceEntity &&
          record.sourceId === params.sourceId &&
          record.targetEntity === params.targetEntity,
      ) as never;
    },
    async findByTarget(tenantId, params) {
      return [...store.values()].filter(
        (record) =>
          record.tenantId === tenantId &&
          record.joinCollection === params.joinCollection &&
          record.targetEntity === params.targetEntity &&
          record.targetId === params.targetId &&
          record.sourceEntity === params.sourceEntity,
      ) as never;
    },
    async deleteByEntityId(tenantId, joinCollection, entityName, entityId) {
      let deleted = 0;
      for (const [key, record] of store.entries()) {
        const matchesSource =
          record.sourceEntity === entityName && record.sourceId === entityId;
        const matchesTarget =
          record.targetEntity === entityName && record.targetId === entityId;
        if (
          record.tenantId === tenantId &&
          record.joinCollection === joinCollection &&
          (matchesSource || matchesTarget)
        ) {
          store.delete(key);
          deleted += 1;
        }
      }
      return deleted;
    },
  };
}

function createTestDeps() {
  const repositories = {
    customer: createMemoryEntityRepository(),
    order: createMemoryEntityRepository(),
    user: createMemoryEntityRepository(),
    project: createMemoryEntityRepository(),
  };

  const deps: RelationServicesDeps = {
    getEntityDefinition: (name) =>
      ([Customer, Order, User, Project] as AnyDefinedEntity[]).find(
        (entity) => entity.name === name,
      ),
    getAllEntityDefinitions: () =>
      [Customer, Order, User, Project] as AnyDefinedEntity[],
    findById: async (entityName, id, tenantId) => {
      const record = await repositories[entityName as keyof typeof repositories]?.findById(
        id,
        tenantId,
      );
      return record ? { id: record.id, tenantId: record.tenantId } : null;
    },
    findByField: async (entityName, field, value, tenantId) => {
      const result = await repositories[
        entityName as keyof typeof repositories
      ]?.findByField({
        tenantId,
        field,
        value,
        limit: 100,
      });
      return (
        result?.items.map((record) => ({
          id: record.id,
          tenantId: record.tenantId,
        })) ?? []
      );
    },
    update: async (entityName, id, tenantId, data) => {
      const updated = await repositories[
        entityName as keyof typeof repositories
      ]?.update(id, tenantId, data);
      return updated ? { id: updated.id, tenantId: updated.tenantId } : null;
    },
    delete: async (entityName, id, tenantId) =>
      (await repositories[entityName as keyof typeof repositories]?.delete(
        id,
        tenantId,
      )) ?? false,
    joinRepository: createMemoryJoinRepository(),
  };

  return { deps, repositories };
}

describe("createRelationValidator", () => {
  it("accepts valid foreign key references", async () => {
    const { deps, repositories } = createTestDeps();
    const now = new Date().toISOString();
    await repositories.customer.create("tenant_a", {
      id: "cust_1",
      tenantId: "tenant_a",
      name: "Acme",
      createdAt: now,
      updatedAt: now,
    });

    const validator = createRelationValidator(deps);
    await expect(
      validator.validateWrite(
        Order,
        {
          orderNumber: "ORD-1",
          customerId: "cust_1",
          tenantId: "tenant_a",
        },
        "create",
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects missing referenced entities", async () => {
    const { deps } = createTestDeps();
    const validator = createRelationValidator(deps);

    await expect(
      validator.validateWrite(
        Order,
        {
          orderNumber: "ORD-1",
          customerId: "missing",
          tenantId: "tenant_a",
        },
        "create",
      ),
    ).rejects.toMatchObject({
      code: RelationErrorCode.RELATION_NOT_FOUND,
    });
  });

  it("rejects required relation fields on create", async () => {
    const { deps } = createTestDeps();
    const validator = createRelationValidator(deps);

    await expect(
      validator.validateWrite(
        Order,
        {
          orderNumber: "ORD-1",
          tenantId: "tenant_a",
        },
        "create",
      ),
    ).rejects.toMatchObject({
      code: RelationErrorCode.RELATION_REQUIRED,
    });
  });
});

describe("createRelationDeleteHandler", () => {
  it("blocks delete when onDelete is restrict", async () => {
    const { deps, repositories } = createTestDeps();
    const now = new Date().toISOString();
    await repositories.customer.create("tenant_a", {
      id: "cust_1",
      tenantId: "tenant_a",
      name: "Acme",
      createdAt: now,
      updatedAt: now,
    });
    await repositories.order.create("tenant_a", {
      id: "ord_1",
      tenantId: "tenant_a",
      orderNumber: "ORD-1",
      customerId: "cust_1",
      createdAt: now,
      updatedAt: now,
    });

    const deleteHandler = createRelationDeleteHandler(deps);
    await expect(
      deleteHandler.beforeDelete(Customer, "cust_1", "tenant_a"),
    ).rejects.toBeInstanceOf(RelationError);
  });
});

describe("createJoinCollectionHandler", () => {
  it("links and queries many-to-many records in both directions", async () => {
    const { deps, repositories } = createTestDeps();
    const now = new Date().toISOString();
    await repositories.user.create("tenant_a", {
      id: "user_1",
      tenantId: "tenant_a",
      name: "Jane",
      createdAt: now,
      updatedAt: now,
    });
    await repositories.project.create("tenant_a", {
      id: "project_1",
      tenantId: "tenant_a",
      title: "Alpha",
      createdAt: now,
      updatedAt: now,
    });

    const joinHandler = createJoinCollectionHandler(deps);
    const joinRecord = await joinHandler.link({
      sourceEntity: User as unknown as AnyDefinedEntity,
      sourceId: "user_1",
      targetEntity: Project as AnyDefinedEntity,
      targetId: "project_1",
      tenantId: "tenant_a",
      joinCollection: "user_projects",
    });

    expect(joinRecord.sourceId).toBe("user_1");
    expect(joinRecord.targetId).toBe("project_1");

    const targets = await joinHandler.findLinkedTargets(
      "tenant_a",
      User as unknown as AnyDefinedEntity,
      "user_1",
      Project as AnyDefinedEntity,
      "user_projects",
    );
    expect(targets).toHaveLength(1);

    const sources = await joinHandler.findLinkedSources(
      "tenant_a",
      Project as AnyDefinedEntity,
      "project_1",
      User as unknown as AnyDefinedEntity,
      "user_projects",
    );
    expect(sources).toHaveLength(1);
  });
});
