import {
  defineEntity,
  registerEntity,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import { describe, expect, it } from "vitest";

import {
  applyRbacFilters,
  applySelectProjection,
  createQueryEngine,
  normalizeEntityQuery,
  parseListQueryInput,
  QueryError,
  QueryErrorCode,
} from "./index.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    score: { type: "number" },
    isActive: { type: "boolean", default: true },
  },
});

const TestItem = defineEntity({
  name: "testItem",
  fields: {
    name: { type: "string", required: true },
    budget: { type: "number", required: true },
    widgetId: {
      type: "relation",
      required: true,
      relation: {
        target: "widget",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
  },
});

registerEntity(Widget as unknown as AnyDefinedEntity);
registerEntity(TestItem as unknown as AnyDefinedEntity);

describe("parseListQueryInput", () => {
  it("merges legacy limit and cursor into pagination", () => {
    const config = parseListQueryInput({ limit: 5, cursor: "abc123" });
    expect(config.pagination).toEqual({ limit: 5, cursor: "abc123" });
  });

  it("parses query JSON and merges top-level pagination", () => {
    const config = parseListQueryInput({
      limit: 10,
      query: JSON.stringify({
        filter: [{ field: "name", operator: "==", value: "Jane" }],
        sort: [{ field: "name", direction: "asc" }],
      }),
    });

    expect(config.filter).toHaveLength(1);
    expect(config.sort).toHaveLength(1);
    expect(config.pagination).toEqual({ limit: 10 });
  });

  it("rejects invalid query JSON", () => {
    expect(() => parseListQueryInput({ query: "{bad json" })).toThrow(
      QueryError,
    );
  });

  it("rejects missing pagination in strict mode", () => {
    expect(() =>
      parseListQueryInput({}, { strictPagination: true }),
    ).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.QUERY_VALIDATION_ERROR }),
    );
  });

  it("rejects excessive limits in strict mode", () => {
    expect(() =>
      parseListQueryInput({ limit: 500 }, { strictPagination: true }),
    ).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.QUERY_VALIDATION_ERROR }),
    );
  });
});

describe("normalizeEntityQuery", () => {
  it("rejects unknown fields", () => {
    expect(() =>
      normalizeEntityQuery(TestItem as unknown as AnyDefinedEntity, {
        filter: [{ field: "missing", operator: "==", value: "x" }],
      }),
    ).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.QUERY_VALIDATION_ERROR }),
    );
  });

  it("rejects tenantId filters", () => {
    expect(() =>
      normalizeEntityQuery(Widget as unknown as AnyDefinedEntity, {
        filter: [{ field: "tenantId", operator: "==", value: "tenant_a" }],
      }),
    ).toThrow(/tenantId/);
  });

  it("rejects invalid operators for field types", () => {
    expect(() =>
      normalizeEntityQuery(Widget as unknown as AnyDefinedEntity, {
        filter: [{ field: "name", operator: ">", value: "a" }],
      }),
    ).toThrow(/not allowed/);
  });

  it("allows relation field equality filters", () => {
    const normalized = normalizeEntityQuery(
      TestItem as unknown as AnyDefinedEntity,
      {
        filter: [{ field: "widgetId", operator: "==", value: "org_1" }],
      },
    );

    expect(normalized.filters).toEqual([
      { field: "widgetId", operator: "==", value: "org_1" },
    ]);
  });

  it("rejects multiple inequality filters", () => {
    expect(() =>
      normalizeEntityQuery(TestItem as unknown as AnyDefinedEntity, {
        filter: [
          { field: "budget", operator: ">", value: 10 },
          { field: "budget", operator: "<", value: 100 },
        ],
      }),
    ).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.QUERY_UNSUPPORTED }),
    );
  });

  it("requires sort field to match inequality filter", () => {
    expect(() =>
      normalizeEntityQuery(TestItem as unknown as AnyDefinedEntity, {
        filter: [{ field: "budget", operator: ">", value: 10 }],
        sort: [{ field: "name", direction: "asc" }],
      }),
    ).toThrow(/primary sort field must match/);
  });

  it("defaults sort to id ascending when no sort or inequality", () => {
    const normalized = normalizeEntityQuery(
      Widget as unknown as AnyDefinedEntity,
      {},
    );
    expect(normalized.sort).toEqual({ field: "id", direction: "asc" });
  });
});

describe("applyRbacFilters", () => {
  it("denies reads without entity permission", () => {
    expect(() =>
      applyRbacFilters("widget", {
        userId: "user_1",
        tenantId: "tenant_a",
        permissions: ["testItem.read"],
      }),
    ).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.QUERY_FORBIDDEN }),
    );
  });

  it("allows superadmin without explicit entity permission", () => {
    expect(
      applyRbacFilters("widget", {
        userId: "user_1",
        tenantId: "tenant_a",
        permissions: [],
        isSuperAdmin: true,
      }),
    ).toEqual([]);
  });
});

describe("applySelectProjection", () => {
  it("always includes id and selected fields", () => {
    const projected = applySelectProjection(
      [{ id: "1", name: "Jane", email: "jane@example.com" }],
      ["name"],
    );

    expect(projected).toEqual([{ id: "1", name: "Jane" }]);
  });
});

describe("createQueryEngine", () => {
  it("executes find through the injected executor", async () => {
    const engine = createQueryEngine({
      getEntityDefinition: (name) =>
        name === "widget" ? (Widget as unknown as AnyDefinedEntity) : undefined,
      getExecutor: () => ({
        async executeQuery() {
          return {
            items: [{ id: "1", name: "Jane", tenantId: "tenant_a" }],
            nextCursor: null,
          };
        },
        async findById() {
          return null;
        },
      }),
    });

    const result = await engine.find(
      "widget",
      {},
      {
        userId: "user_1",
        tenantId: "tenant_a",
        permissions: ["widget.read"],
      },
    );

    expect(result.data).toHaveLength(1);
  });

  it("throws NOT_FOUND when findOne misses", async () => {
    const engine = createQueryEngine({
      getEntityDefinition: (name) =>
        name === "widget" ? (Widget as unknown as AnyDefinedEntity) : undefined,
      getExecutor: () => ({
        async executeQuery() {
          return { items: [], nextCursor: null };
        },
        async findById() {
          return null;
        },
      }),
    });

    await expect(
      engine.findOne("widget", "missing", {
        userId: "user_1",
        tenantId: "tenant_a",
        permissions: ["widget.read"],
      }),
    ).rejects.toMatchObject({ code: QueryErrorCode.NOT_FOUND });
  });
});
