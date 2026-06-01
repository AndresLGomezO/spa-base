import { describe, expect, it } from "vitest";

import type { FieldDefinitionRecord } from "@repo/dynamic-entities";

import { resolveRatesListFieldUi } from "./field-ui-policy.js";

function field(partial: FieldDefinitionRecord): FieldDefinitionRecord {
  return partial;
}

describe("resolveRatesListFieldUi", () => {
  it("excludes sensitive decimal fields from list capabilities", () => {
    expect(
      resolveRatesListFieldUi(
        "account",
        field({
          name: "balance",
          type: "number",
          numberKind: "decimal",
          sensitive: true,
        }),
      ),
    ).toEqual({
      filterable: false,
      sortable: false,
      searchable: false,
    });
  });

  it("allows search on name for financialProduct but not description", () => {
    expect(
      resolveRatesListFieldUi(
        "financialProduct",
        field({ name: "name", type: "string" }),
      ),
    ).toEqual({
      filterable: false,
      sortable: false,
      searchable: true,
    });

    expect(
      resolveRatesListFieldUi(
        "financialProduct",
        field({ name: "description", type: "string" }),
      ),
    ).toEqual({
      filterable: false,
      sortable: false,
      searchable: false,
    });
  });

  it("configures productTerm with filterable FKs and sortable integers only", () => {
    expect(
      resolveRatesListFieldUi(
        "productTerm",
        field({
          name: "productId",
          type: "relation",
          relation: {
            target: "financialProduct",
            type: "many-to-one",
            onDelete: "restrict",
          },
        }),
      ),
    ).toEqual({
      filterable: true,
      sortable: false,
      searchable: false,
    });

    expect(
      resolveRatesListFieldUi(
        "productTerm",
        field({
          name: "totalPeriods",
          type: "number",
          numberKind: "integer",
        }),
      ),
    ).toEqual({
      filterable: false,
      sortable: true,
      searchable: false,
    });

    expect(
      resolveRatesListFieldUi(
        "productTerm",
        field({ name: "notes", type: "string" }),
      ),
    ).toEqual({
      filterable: false,
      sortable: false,
      searchable: false,
    });
  });

  it("allows lookup entity code fields to sort and search", () => {
    expect(
      resolveRatesListFieldUi(
        "rateType",
        field({ name: "code", type: "string" }),
      ),
    ).toEqual({
      filterable: false,
      sortable: true,
      searchable: true,
    });
  });

  it("allows subscription provider and planName to be searchable", () => {
    expect(
      resolveRatesListFieldUi(
        "subscriptionDetail",
        field({ name: "provider", type: "string" }),
      ),
    ).toEqual({
      filterable: false,
      sortable: false,
      searchable: true,
    });
  });
});
