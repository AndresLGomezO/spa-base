import {
  defineEntity,
  registerEntity,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./cursor.js";
import { QueryError, QueryErrorCode } from "./errors.js";
import {
  normalizeEntityQuery,
  parseListQueryInput,
  resolveSearchField,
} from "./parse-query-config.js";
import { applyPostFilters, computeOverfetchLimit } from "./post-filters.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const TestEntity = defineEntity({
  name: "testAdvanced",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string" },
    amount: { type: "number" },
    isPublished: { type: "boolean" },
    createdDate: { type: "date" },
    secret: { type: "string", sensitive: true },
  },
  displayField: "title",
});

const NoStringEntity = defineEntity({
  name: "noStrings",
  fields: {
    count: { type: "number", required: true },
    isActive: { type: "boolean" },
  },
});

registerEntity(TestEntity as unknown as AnyDefinedEntity);
registerEntity(NoStringEntity as unknown as AnyDefinedEntity);

describe("parseListQueryInput - search parameter", () => {
  it("parses search from JSON query", () => {
    const config = parseListQueryInput({
      query: JSON.stringify({
        search: "hello",
        pagination: { limit: 10 },
      }),
    });
    expect(config.search).toBe("hello");
  });

  it("parses search from top-level input", () => {
    const config = parseListQueryInput({
      search: "world",
      limit: 10,
    });
    expect(config.search).toBe("world");
  });

  it("prefers JSON search over top-level search", () => {
    const config = parseListQueryInput({
      search: "top-level",
      query: JSON.stringify({
        search: "json-level",
        pagination: { limit: 10 },
      }),
    });
    expect(config.search).toBe("json-level");
  });
});

describe("parseListQueryInput - new filter operators", () => {
  it("accepts contains operator", () => {
    const config = parseListQueryInput({
      query: JSON.stringify({
        filter: [{ field: "title", operator: "contains", value: "test" }],
        pagination: { limit: 20 },
      }),
    });
    expect(config.filter?.[0]?.operator).toBe("contains");
  });

  it("accepts startsWith operator", () => {
    const config = parseListQueryInput({
      query: JSON.stringify({
        filter: [{ field: "title", operator: "startsWith", value: "pre" }],
        pagination: { limit: 20 },
      }),
    });
    expect(config.filter?.[0]?.operator).toBe("startsWith");
  });

  it("accepts endsWith operator", () => {
    const config = parseListQueryInput({
      query: JSON.stringify({
        filter: [{ field: "title", operator: "endsWith", value: "fix" }],
        pagination: { limit: 20 },
      }),
    });
    expect(config.filter?.[0]?.operator).toBe("endsWith");
  });
});

describe("normalizeEntityQuery - post-filters", () => {
  it("splits contains/startsWith/endsWith into postFilters", () => {
    const normalized = normalizeEntityQuery(
      TestEntity as unknown as AnyDefinedEntity,
      {
        filter: [
          { field: "title", operator: "contains", value: "test" },
          { field: "title", operator: "==", value: "exact" },
        ],
      },
    );
    expect(normalized.filters).toHaveLength(1);
    expect(normalized.filters[0]?.operator).toBe("==");
    expect(normalized.postFilters).toHaveLength(1);
    expect(normalized.postFilters[0]?.operator).toBe("contains");
  });

  it("rejects contains on non-string fields", () => {
    expect(() =>
      normalizeEntityQuery(TestEntity as unknown as AnyDefinedEntity, {
        filter: [{ field: "amount", operator: "contains", value: "5" }],
      }),
    ).toThrow(/not allowed/);
  });

  it("rejects post-filter operators with non-string values", () => {
    expect(() =>
      normalizeEntityQuery(TestEntity as unknown as AnyDefinedEntity, {
        filter: [{ field: "title", operator: "contains", value: 123 }],
      }),
    ).toThrow(/requires a string value/);
  });
});

describe("normalizeEntityQuery - search", () => {
  it("generates token post-filter for search term on tokens field", () => {
    const normalized = normalizeEntityQuery(
      TestEntity as unknown as AnyDefinedEntity,
      { search: "hello" },
    );
    expect(normalized.search).toBe("hello");
    expect(normalized.searchField).toBe("titleSearchTokens");
    expect(normalized.filters).toHaveLength(0);
    expect(normalized.postFilters).toHaveLength(1);
    expect(normalized.postFilters[0]?.field).toBe("titleSearchTokens");
    expect(normalized.postFilters[0]?.operator).toBe("tokenStartsWith");
    expect(normalized.postFilters[0]?.value).toBe("hello");
  });

  it("preserves user sort when search is active", () => {
    const normalized = normalizeEntityQuery(
      TestEntity as unknown as AnyDefinedEntity,
      {
        search: "test",
        sort: [{ field: "amount", direction: "desc" }],
      },
    );
    expect(normalized.sort?.field).toBe("amount");
    expect(normalized.sort?.direction).toBe("desc");
  });

  it("throws SEARCH_NOT_CONFIGURED for entity without string fields", () => {
    expect(() =>
      normalizeEntityQuery(NoStringEntity as unknown as AnyDefinedEntity, {
        search: "test",
      }),
    ).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.SEARCH_NOT_CONFIGURED }),
    );
  });
});

describe("normalizeEntityQuery - encrypted fields", () => {
  it("rejects filter on sensitive field with QUERY_ON_ENCRYPTED_FIELD", () => {
    expect(() =>
      normalizeEntityQuery(TestEntity as unknown as AnyDefinedEntity, {
        filter: [{ field: "secret", operator: "==", value: "x" }],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: QueryErrorCode.QUERY_ON_ENCRYPTED_FIELD,
      }),
    );
  });
});

function withSearchableUi(
  entity: AnyDefinedEntity,
  fields: Record<string, { searchable: boolean }>,
  viewFields: string[],
): AnyDefinedEntity {
  return {
    ...entity,
    metadata: {
      ...entity.metadata,
      ui: {
        views: [{ type: "table", name: "default", fields: viewFields }],
        forms: {
          create: { sections: [{ fields: viewFields }] },
          edit: { sections: [{ fields: viewFields }] },
        },
        fields,
      },
    },
  } as AnyDefinedEntity;
}

describe("resolveSearchField", () => {
  it("returns displayField when it is a non-sensitive string", () => {
    expect(resolveSearchField(TestEntity as unknown as AnyDefinedEntity)).toBe(
      "title",
    );
  });

  it("returns null for entity with no string fields", () => {
    expect(
      resolveSearchField(NoStringEntity as unknown as AnyDefinedEntity),
    ).toBe(null);
  });

  it("skips displayField when searchable is false", () => {
    const entity = withSearchableUi(
      defineEntity({
        name: "searchableFlags",
        fields: {
          title: { type: "string", required: true },
          code: { type: "string", required: true },
        },
        displayField: "title",
      }) as unknown as AnyDefinedEntity,
      {
        title: { searchable: false },
        code: { searchable: true },
      },
      ["title", "code"],
    );

    expect(resolveSearchField(entity)).toBe("code");
  });

  it("returns null when all string fields are explicitly non-searchable", () => {
    const entity = withSearchableUi(
      defineEntity({
        name: "noSearch",
        fields: {
          title: { type: "string", required: true },
          description: { type: "string" },
        },
        displayField: "title",
      }) as unknown as AnyDefinedEntity,
      {
        title: { searchable: false },
        description: { searchable: false },
      },
      ["title", "description"],
    );

    expect(resolveSearchField(entity)).toBe(null);
  });

  it("does not search relation display fields", () => {
    const entity = withSearchableUi(
      defineEntity({
        name: "relationDisplay",
        fields: {
          productId: {
            type: "relation",
            relation: {
              target: "product",
              type: "many-to-one",
              onDelete: "restrict",
            },
          },
          code: { type: "string" },
        },
        displayField: "productId",
      }) as unknown as AnyDefinedEntity,
      {
        productId: { searchable: false },
        code: { searchable: false },
      },
      ["productId", "code"],
    );

    expect(resolveSearchField(entity)).toBe(null);
  });

  it("token post-filter matches any word prefix on mirror tokens", () => {
    const normalized = normalizeEntityQuery(
      TestEntity as unknown as AnyDefinedEntity,
      { search: "ahorr" },
    );
    const record = {
      title: "Bancolombia Ahorros",
      titleSearchTokens: ["bancolombia", "ahorros"],
    };
    const result = applyPostFilters([record], normalized.postFilters);
    expect(result).toHaveLength(1);
  });

  it("token post-filter does not match mid-token substring", () => {
    const normalized = normalizeEntityQuery(
      TestEntity as unknown as AnyDefinedEntity,
      { search: "colomb" },
    );
    const record = {
      title: "Bancolombia Ahorros",
      titleSearchTokens: ["bancolombia", "ahorros"],
    };
    const result = applyPostFilters([record], normalized.postFilters);
    expect(result).toHaveLength(0);
  });

  it("uses source field contains for in-memory list entities", () => {
    const InMemoryEntity = defineEntity({
      name: "inMemoryTag",
      fields: {
        code: { type: "string", required: true },
        label: { type: "string", required: true },
      },
      inMemoryListQueries: true,
      ui: {
        views: [{ type: "table", name: "default", fields: ["code", "label"] }],
        forms: {
          create: { sections: [{ fields: ["code", "label"] }] },
          edit: { sections: [{ fields: ["code", "label"] }] },
        },
        fields: {
          code: { searchable: true },
          label: { searchable: true },
        },
      },
    }) as unknown as AnyDefinedEntity;

    const normalized = normalizeEntityQuery(InMemoryEntity, {
      search: "lomb",
    });

    expect(normalized.postFilters).toHaveLength(1);
    expect(normalized.postFilters[0]?.operator).toBe("sourceFieldsContain");

    const matching = applyPostFilters(
      [{ code: "A1", label: "Bancolombia Savings" }],
      normalized.postFilters,
    );
    const missing = applyPostFilters(
      [{ code: "A2", label: "Other Bank" }],
      normalized.postFilters,
    );

    expect(matching).toHaveLength(1);
    expect(missing).toHaveLength(0);
  });
});

describe("applyPostFilters", () => {
  const items: Record<string, unknown>[] = [
    { id: "1", title: "Hello World", description: "A greeting" },
    { id: "2", title: "Foo Bar", description: "Testing stuff" },
    { id: "3", title: "Bar Baz", description: "Another test" },
    { id: "4", title: "HELLO upper", description: "case insensitive" },
  ];

  it("filters with contains (case insensitive)", () => {
    const result = applyPostFilters(items, [
      { field: "title", operator: "contains", value: "hello" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("1");
    expect(result[1]?.id).toBe("4");
  });

  it("filters with startsWith (case insensitive)", () => {
    const result = applyPostFilters(items, [
      { field: "title", operator: "startsWith", value: "foo" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("2");
  });

  it("filters with endsWith (case insensitive)", () => {
    const result = applyPostFilters(items, [
      { field: "title", operator: "endsWith", value: "baz" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("3");
  });

  it("applies multiple post-filters as AND", () => {
    const result = applyPostFilters(items, [
      { field: "title", operator: "contains", value: "bar" },
      { field: "description", operator: "startsWith", value: "another" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("3");
  });

  it("returns all items when no post-filters", () => {
    const result = applyPostFilters(items, []);
    expect(result).toHaveLength(4);
  });

  it("returns empty when no items match", () => {
    const result = applyPostFilters(items, [
      { field: "title", operator: "contains", value: "nonexistent" },
    ]);
    expect(result).toHaveLength(0);
  });

  it("filters with tokenStartsWith on string array tokens", () => {
    const tokenItems: Record<string, unknown>[] = [
      {
        id: "1",
        name: "Bancolombia Ahorros",
        nameSearchTokens: ["bancolombia", "ahorros"],
      },
      {
        id: "2",
        name: "Other Bank",
        nameSearchTokens: ["other", "bank"],
      },
    ];

    expect(
      applyPostFilters(tokenItems, [
        {
          field: "nameSearchTokens",
          operator: "tokenStartsWith",
          value: "bancol",
        },
      ]),
    ).toHaveLength(1);

    expect(
      applyPostFilters(tokenItems, [
        {
          field: "nameSearchTokens",
          operator: "tokenStartsWith",
          value: "ahorr",
        },
      ]),
    ).toHaveLength(1);

    expect(
      applyPostFilters(tokenItems, [
        {
          field: "nameSearchTokens",
          operator: "tokenStartsWith",
          value: "colomb",
        },
      ]),
    ).toHaveLength(0);
  });
});

describe("computeOverfetchLimit", () => {
  it("returns requested limit when no post-filters", () => {
    expect(computeOverfetchLimit(20, false)).toBe(20);
  });

  it("multiplies limit when post-filters are present", () => {
    expect(computeOverfetchLimit(20, true)).toBe(60);
  });
});

describe("cursor signing and verification", () => {
  const secret = "test-secret-key-for-cursor";

  it("encodes and decodes a cursor round-trip", () => {
    const lastItem = { id: "doc_42", title: "Test", score: 95 };
    const encoded = encodeCursor(lastItem, "title", secret);
    const decoded = decodeCursor(encoded, secret);

    expect(decoded.id).toBe("doc_42");
    expect(decoded.sortValues.title).toBe("Test");
    expect(decoded.sortValues.id).toBe("doc_42");
    expect(decoded.v).toBe(1);
  });

  it("includes sort field and id in cursor payload", () => {
    const lastItem = { id: "abc", name: "Zoe" };
    const encoded = encodeCursor(lastItem, "name", secret);
    const decoded = decodeCursor(encoded, secret);

    expect(decoded.sortValues).toEqual({ name: "Zoe", id: "abc" });
  });

  it("omits duplicate id from sortValues when sorting by id", () => {
    const lastItem = { id: "xyz" };
    const encoded = encodeCursor(lastItem, "id", secret);
    const decoded = decodeCursor(encoded, secret);

    expect(decoded.sortValues).toEqual({ id: "xyz" });
  });

  it("rejects tampered cursor", () => {
    const encoded = encodeCursor({ id: "1" }, "id", secret);
    const tampered = encoded.slice(0, -5) + "XXXXX";

    expect(() => decodeCursor(tampered, secret)).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.INVALID_CURSOR }),
    );
  });

  it("rejects cursor without signature separator", () => {
    expect(() => decodeCursor("noseparator", secret)).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.INVALID_CURSOR }),
    );
  });

  it("rejects cursor with wrong secret", () => {
    const encoded = encodeCursor({ id: "1" }, "id", secret);
    expect(() => decodeCursor(encoded, "wrong-secret")).toThrowError(
      expect.objectContaining({ code: QueryErrorCode.INVALID_CURSOR }),
    );
  });
});

describe("error codes", () => {
  it("has all expected error codes defined", () => {
    expect(QueryErrorCode.QUERY_VALIDATION_ERROR).toBe(
      "QUERY_VALIDATION_ERROR",
    );
    expect(QueryErrorCode.QUERY_UNSUPPORTED).toBe("QUERY_UNSUPPORTED");
    expect(QueryErrorCode.QUERY_FORBIDDEN).toBe("QUERY_FORBIDDEN");
    expect(QueryErrorCode.NOT_FOUND).toBe("NOT_FOUND");
    expect(QueryErrorCode.QUERY_ON_ENCRYPTED_FIELD).toBe(
      "QUERY_ON_ENCRYPTED_FIELD",
    );
    expect(QueryErrorCode.COMPOSITE_INDEX_REQUIRED).toBe(
      "COMPOSITE_INDEX_REQUIRED",
    );
    expect(QueryErrorCode.SEARCH_NOT_CONFIGURED).toBe("SEARCH_NOT_CONFIGURED");
    expect(QueryErrorCode.INVALID_CURSOR).toBe("INVALID_CURSOR");
    expect(QueryErrorCode.QUERY_TOO_BROAD).toBe("QUERY_TOO_BROAD");
  });

  it("QueryError carries the correct code and message", () => {
    const error = new QueryError(QueryErrorCode.INVALID_CURSOR, "test message");
    expect(error.code).toBe("INVALID_CURSOR");
    expect(error.message).toBe("test message");
    expect(error).toBeInstanceOf(Error);
  });
});
