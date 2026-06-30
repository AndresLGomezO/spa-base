import { describe, expect, it, vi } from "vitest";

import {
  isCreateFormPrefillTargetFieldEligible,
  listCreateFormPrefillTargetFields,
  resolveEntityFormPrefillMappings,
} from "./resolve-entity-form-prefill-mappings.js";

const targetDefinition = {
  name: "transaction",
  fields: {
    id: { type: "string" },
    accountId: {
      type: "string",
      relation: { type: "many-to-one", target: "account" },
    },
    amount: { type: "number" },
    postedAt: { type: "date" },
    status: {
      type: "enum",
      enumValues: ["draft", "posted"],
    },
    notes: { type: "string" },
    attachment: { type: "document" },
    lineItems: {
      type: "array",
      relation: { type: "one-to-many", target: "lineItem" },
    },
  },
  ui: {
    fields: {
      postedAt: { dateDisplayFormat: "date" },
    },
  },
} as const;

describe("resolveEntityFormPrefillMappings", () => {
  it("maps field sources from context values", () => {
    const prefill = resolveEntityFormPrefillMappings(
      [
        {
          targetField: "accountId",
          source: { type: "field", path: "id" },
        },
        {
          targetField: "amount",
          source: { type: "field", path: "balance" },
        },
      ],
      targetDefinition as never,
      (path) => (path === "id" ? "account-1" : path === "balance" ? 42 : null),
    );

    expect(prefill).toEqual({
      accountId: "account-1",
      amount: "42",
    });
  });

  it("uses current date for date targets respecting display format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T15:30:00.000Z"));

    const prefill = resolveEntityFormPrefillMappings(
      [{ targetField: "postedAt", source: { type: "currentDate" } }],
      targetDefinition as never,
      () => null,
    );

    expect(prefill).toEqual({ postedAt: "2026-06-29" });
    vi.useRealTimers();
  });

  it("uses enum value for enum targets when value is allowed", () => {
    const prefill = resolveEntityFormPrefillMappings(
      [
        {
          targetField: "status",
          source: { type: "enumValue", value: "draft" },
        },
      ],
      targetDefinition as never,
      () => null,
    );

    expect(prefill).toEqual({ status: "draft" });
  });

  it("skips invalid enum values", () => {
    const prefill = resolveEntityFormPrefillMappings(
      [
        {
          targetField: "status",
          source: { type: "enumValue", value: "invalid" },
        },
      ],
      targetDefinition as never,
      () => null,
    );

    expect(prefill).toEqual({});
  });

  it("skips ineligible targets and empty source values", () => {
    const prefill = resolveEntityFormPrefillMappings(
      [
        { targetField: "attachment", source: { type: "field", path: "id" } },
        { targetField: "lineItems", source: { type: "field", path: "id" } },
        { targetField: "notes", source: { type: "field", path: "empty" } },
        {
          targetField: "postedAt",
          source: { type: "currentDate" },
        },
      ],
      targetDefinition as never,
      (path) => (path === "empty" ? "   " : "value"),
    );

    expect(prefill).toEqual({
      postedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });
});

describe("isCreateFormPrefillTargetFieldEligible", () => {
  it("accepts scalar and FK relation fields only", () => {
    expect(
      isCreateFormPrefillTargetFieldEligible(
        "accountId",
        targetDefinition as never,
      ),
    ).toBe(true);
    expect(
      isCreateFormPrefillTargetFieldEligible(
        "lineItems",
        targetDefinition as never,
      ),
    ).toBe(false);
    expect(
      isCreateFormPrefillTargetFieldEligible(
        "nested.path",
        targetDefinition as never,
      ),
    ).toBe(false);
  });
});

describe("listCreateFormPrefillTargetFields", () => {
  it("returns sorted eligible root fields", () => {
    expect(
      listCreateFormPrefillTargetFields(targetDefinition as never),
    ).toEqual(["accountId", "amount", "id", "notes", "postedAt", "status"]);
  });
});
