import { describe, expect, it } from "vitest";

import { defineEntity } from "./defineEntity.js";
import {
  buildPermissions,
  defaultCollectionName,
} from "./metadata/buildPermissions.js";
import {
  clearEntityRegistry,
  getAllEntities,
  getEntity,
  registerEntity,
} from "./registry/entityRegistry.js";

const Customer = defineEntity({
  name: "customer",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    age: { type: "number" },
    isActive: { type: "boolean", default: true },
  },
});

const Order = defineEntity({
  name: "order",
  fields: {
    orderNumber: { type: "string", required: true },
    total: { type: "number", required: true },
    placedAt: { type: "date" },
    isFulfilled: { type: "boolean", default: false },
  },
});

describe("defineEntity", () => {
  it("builds metadata with collection name and permissions", () => {
    expect(Customer.metadata.name).toBe("customer");
    expect(Customer.metadata.collection).toBe("customers");
    expect(Customer.metadata.permissions).toEqual([
      "customer.read",
      "customer.create",
      "customer.update",
      "customer.delete",
      "customer.share",
      "customer.manage_shares",
    ]);
  });

  it("allows explicit collection override", () => {
    const entity = defineEntity({
      name: "invoice",
      collection: "billing_invoices",
      fields: {
        amount: { type: "number", required: true },
      },
    });

    expect(entity.metadata.collection).toBe("billing_invoices");
  });

  it("normalizes field metadata", () => {
    expect(Customer.metadata.fields.name).toEqual({
      type: "string",
      required: true,
      optional: false,
    });
    expect(Customer.metadata.fields.email).toEqual({
      type: "string",
      required: false,
      optional: true,
    });
    expect(Customer.metadata.fields.isActive).toEqual({
      type: "boolean",
      required: false,
      optional: true,
      default: true,
    });
  });
});

describe("entity schemas", () => {
  const now = new Date().toISOString();

  it("validates a full entity document with system fields", () => {
    const result = Customer.schema.safeParse({
      id: "cust_1",
      tenantId: "tenant_1",
      name: "Jane Doe",
      email: "jane@example.com",
      age: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    expect(result.success).toBe(true);
  });

  it("rejects full documents missing required user fields", () => {
    const result = Customer.schema.safeParse({
      id: "cust_1",
      tenantId: "tenant_1",
      email: "jane@example.com",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    expect(result.success).toBe(false);
  });

  it("rejects full documents missing system fields", () => {
    const result = Customer.schema.safeParse({
      name: "Jane Doe",
      isActive: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown keys on full schema", () => {
    const result = Customer.schema.safeParse({
      id: "cust_1",
      tenantId: "tenant_1",
      name: "Jane Doe",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      extra: "not allowed",
    });

    expect(result.success).toBe(false);
  });

  it("validates create input without system fields", () => {
    const result = Customer.createSchema.safeParse({
      name: "Jane Doe",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects create input with system fields", () => {
    const result = Customer.createSchema.safeParse({
      name: "Jane Doe",
      tenantId: "tenant_1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects create input missing required fields", () => {
    const result = Customer.createSchema.safeParse({
      email: "jane@example.com",
    });

    expect(result.success).toBe(false);
  });

  it("validates partial update input", () => {
    const result = Customer.updateSchema.safeParse({
      email: "updated@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("allows empty update object", () => {
    const result = Customer.updateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid date strings", () => {
    const result = Order.createSchema.safeParse({
      orderNumber: "ORD-1",
      total: 99.5,
      placedAt: "not-a-date",
    });

    expect(result.success).toBe(false);
  });

  it("rejects loose date parses such as text with numbers", () => {
    const result = Order.createSchema.safeParse({
      orderNumber: "ORD-1",
      total: 99.5,
      placedAt: "test 1",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid ISO date strings", () => {
    const result = Order.createSchema.safeParse({
      orderNumber: "ORD-1",
      total: 99.5,
      placedAt: now,
    });

    expect(result.success).toBe(true);
  });
});

describe("field type coverage", () => {
  const AllTypes = defineEntity({
    name: "sample",
    fields: {
      label: { type: "string", required: true },
      count: { type: "number" },
      enabled: { type: "boolean", default: false },
      scheduledAt: { type: "date" },
    },
  });

  it("generates schemas for all phase-1 field types", () => {
    const now = new Date().toISOString();
    const createResult = AllTypes.createSchema.safeParse({
      label: "Test",
    });
    const fullResult = AllTypes.schema.safeParse({
      id: "1",
      tenantId: "t1",
      label: "Test",
      enabled: false,
      createdAt: now,
      updatedAt: now,
    });

    expect(createResult.success).toBe(true);
    expect(fullResult.success).toBe(true);
  });
});

describe("relation fields", () => {
  const OrderWithCustomer = defineEntity({
    name: "order",
    fields: {
      orderNumber: { type: "string", required: true },
      customerId: {
        type: "relation",
        required: true,
        relation: { target: "customer", type: "many-to-one" },
      },
    },
  });

  it("normalizes relation field metadata", () => {
    expect(OrderWithCustomer.metadata.fields.customerId).toEqual({
      type: "relation",
      required: true,
      optional: false,
      relation: {
        target: "customer",
        type: "many-to-one",
        onDelete: "restrict",
      },
    });
  });

  it("validates foreign key relation fields in create and full schemas", () => {
    const now = new Date().toISOString();
    const createResult = OrderWithCustomer.createSchema.safeParse({
      orderNumber: "ORD-1",
      customerId: "cust_1",
    });
    const fullResult = OrderWithCustomer.schema.safeParse({
      id: "ord_1",
      tenantId: "tenant_1",
      orderNumber: "ORD-1",
      customerId: "cust_1",
      createdAt: now,
      updatedAt: now,
    });

    expect(createResult.success).toBe(true);
    expect(fullResult.success).toBe(true);
  });

  it("rejects empty relation foreign keys", () => {
    const result = OrderWithCustomer.createSchema.safeParse({
      orderNumber: "ORD-1",
      customerId: "",
    });

    expect(result.success).toBe(false);
  });

  it("excludes join-collection relations from zod schemas", () => {
    const UserWithProjects = defineEntity({
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

    const now = new Date().toISOString();
    const createResult = UserWithProjects.createSchema.safeParse({
      name: "Jane",
    });
    const fullResult = UserWithProjects.schema.safeParse({
      id: "user_1",
      tenantId: "tenant_1",
      name: "Jane",
      createdAt: now,
      updatedAt: now,
    });

    expect(createResult.success).toBe(true);
    expect(fullResult.success).toBe(true);
    expect(UserWithProjects.metadata.fields.projects.relation).toEqual({
      target: "project",
      type: "many-to-many",
      joinCollection: "user_projects",
      onDelete: "restrict",
    });
  });
});

describe("buildPermissions", () => {
  it("generates CRUD and ownership permissions for an entity name", () => {
    expect(buildPermissions("order")).toEqual([
      "order.read",
      "order.create",
      "order.update",
      "order.delete",
      "order.share",
      "order.manage_shares",
    ]);
  });
});

describe("defaultCollectionName", () => {
  it("pluralizes regular names", () => {
    expect(defaultCollectionName("customer")).toBe("customers");
    expect(defaultCollectionName("order")).toBe("orders");
  });

  it("handles names ending in s", () => {
    expect(defaultCollectionName("status")).toBe("statuses");
  });
});

describe("entity registry", () => {
  it("registers and retrieves entities by name", () => {
    clearEntityRegistry();
    registerEntity(Customer);
    registerEntity(Order);

    expect(getEntity("customer")).toBe(Customer);
    expect(getEntity("order")).toBe(Order);
    expect(getAllEntities()).toHaveLength(2);
    expect(getEntity("missing")).toBeUndefined();

    clearEntityRegistry();
  });
});

describe("mock downstream consumers", () => {
  it("simulates API route validation", () => {
    const body = { name: "Acme Corp", email: "ops@acme.test" };
    const parsed = Customer.createSchema.safeParse(body);

    expect(parsed.success).toBe(true);
  });

  it("simulates UI column metadata", () => {
    const columns = Object.entries(Customer.metadata.fields).map(
      ([fieldName, meta]) => ({
        fieldName,
        type: meta.type,
        required: meta.required,
      }),
    );

    expect(columns).toContainEqual({
      fieldName: "name",
      type: "string",
      required: true,
    });
  });

  it("simulates RBAC permission registration", () => {
    expect(Customer.metadata.permissions.includes("customer.read")).toBe(true);
    expect(Customer.metadata.permissions.includes("customer.delete")).toBe(
      true,
    );
  });
});

describe("type inference", () => {
  it("infers entity types without manual annotations", () => {
    type CustomerRecord = typeof Customer.schema._output;
    type CustomerCreate = typeof Customer.createSchema._output;
    type CustomerUpdate = typeof Customer.updateSchema._output;

    const record: CustomerRecord = {
      id: "1",
      tenantId: "t1",
      name: "Jane",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const create: CustomerCreate = {
      name: "Jane",
    };

    const update: CustomerUpdate = {
      email: "jane@example.com",
    };

    expect(record.name).toBe("Jane");
    expect(create.name).toBe("Jane");
    expect(update.email).toBe("jane@example.com");
  });
});
