import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog.js";
import {
  createDefaultConditionField,
  createDefaultConditionValue,
  listDirectEntityFieldOptions,
  normalizeConditionValue,
  resolveEntityFieldMeta,
} from "./entity-field-condition-utils.js";

const transactionEntity = {
  name: "transaction",
  collection: "transaction",
  permissions: [],
  fields: {
    type: {
      type: "enum",
      required: true,
      optional: false,
      enumValues: ["INCOME", "EXPENSE", "PAYMENT", "INVESTMENT"],
    },
    amount: {
      type: "number",
      required: true,
      optional: false,
    },
    active: {
      type: "boolean",
      required: false,
      optional: true,
    },
  },
  ui: {
    views: [],
    forms: {
      create: {
        layout: {
          root: { type: "root", id: "r", columnCount: 1, columns: [] },
        },
      },
      edit: {
        layout: {
          root: { type: "root", id: "r", columnCount: 1, columns: [] },
        },
      },
    },
  },
} satisfies EntityCatalogEntry;

describe("entity-field-condition-utils", () => {
  it("lists direct entity fields excluding documents", () => {
    expect(
      listDirectEntityFieldOptions(transactionEntity).map(
        (entry) => entry.value,
      ),
    ).toEqual(["active", "amount", "type"]);
  });

  it("resolves field metadata by path", () => {
    expect(resolveEntityFieldMeta(transactionEntity, "type")?.type).toBe(
      "enum",
    );
    expect(
      resolveEntityFieldMeta(transactionEntity, "missing"),
    ).toBeUndefined();
  });

  it("normalizes enum equals values to a valid enum member", () => {
    expect(
      normalizeConditionValue(transactionEntity.fields.type, "==", "INVALID"),
    ).toBe("INCOME");
    expect(
      normalizeConditionValue(transactionEntity.fields.type, "==", "EXPENSE"),
    ).toBe("EXPENSE");
  });

  it("normalizes enum in values to arrays and filters invalid entries", () => {
    expect(
      normalizeConditionValue(transactionEntity.fields.type, "in", [
        "INCOME",
        "INVALID",
        "EXPENSE",
      ]),
    ).toEqual(["INCOME", "EXPENSE"]);
    expect(
      normalizeConditionValue(transactionEntity.fields.type, "in", "INCOME"),
    ).toEqual(["INCOME"]);
  });

  it("preserves compatible values when switching equals to in", () => {
    expect(
      normalizeConditionValue(
        transactionEntity.fields.type,
        "in",
        normalizeConditionValue(transactionEntity.fields.type, "==", "PAYMENT"),
      ),
    ).toEqual(["PAYMENT"]);
  });

  it("normalizes boolean equals values", () => {
    expect(
      normalizeConditionValue(transactionEntity.fields.active, "==", "maybe"),
    ).toBe("");
    expect(
      normalizeConditionValue(transactionEntity.fields.active, "==", "true"),
    ).toBe("true");
  });

  it("falls back to string behavior for unknown fields", () => {
    expect(normalizeConditionValue(undefined, "==", "hello")).toBe("hello");
    expect(normalizeConditionValue(undefined, "in", "a, b")).toEqual([
      "a",
      "b",
    ]);
  });

  it("creates sensible defaults from entity metadata", () => {
    expect(createDefaultConditionField(transactionEntity)).toBe("type");
    expect(createDefaultConditionValue(transactionEntity, "type", "==")).toBe(
      "INCOME",
    );
    expect(
      createDefaultConditionValue(transactionEntity, "type", "in"),
    ).toEqual(["INCOME"]);
  });
});
