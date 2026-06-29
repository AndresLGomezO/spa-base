import { describe, expect, it, vi } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  ENTITY_QUERY_NO_MATCH_ID,
  expandRelationFilters,
} from "./expand-relation-filters.js";

type TestEntityFields = {
  readonly [key: string]: {
    readonly type: string;
    readonly required: boolean;
    readonly optional?: boolean;
    readonly relation?: { readonly type: string; readonly target: string };
  };
};

function makeDefinition(
  name: string,
  fields: TestEntityFields,
): SerializableEntityDefinition {
  return {
    name,
    collection: name,
    permissions: [],
    fields: fields as SerializableEntityDefinition["fields"],
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      fields: {},
    },
  };
}

const contractDefinition = makeDefinition("contract", {
  name: { type: "string", required: true },
  providerId: {
    type: "relation",
    required: true,
    relation: { type: "many-to-one", target: "provider" },
  },
});

const providerDefinition = makeDefinition("provider", {
  name: { type: "string", required: true },
});

const contractTermsDefinition = makeDefinition("contractTerms", {
  contractId: {
    type: "relation",
    required: true,
    relation: { type: "many-to-one", target: "contract" },
  },
  effectiveDate: { type: "date", required: true },
});

const catalog = [
  contractDefinition,
  providerDefinition,
  contractTermsDefinition,
];

describe("expandRelationFilters", () => {
  it("expands many-to-one relation filters into FK in lists", async () => {
    const listChildRecords = vi.fn(async () => [
      { id: "provider_1" },
      { id: "provider_2" },
    ]);

    const result = await expandRelationFilters({
      sourceEntity: "contract",
      catalog,
      filters: [
        {
          field: "provider.name",
          operator: "==",
          value: { type: "static", value: "Acme" },
        },
      ],
      listChildRecords,
    });

    expect(listChildRecords).toHaveBeenCalledWith("provider", {
      filter: [
        {
          field: "name",
          operator: "==",
          value: "Acme",
        },
      ],
    });
    expect(result.filters).toEqual([
      {
        field: "providerId",
        operator: "in",
        value: ["provider_1", "provider_2"],
      },
    ]);
  });

  it("expands one-to-many relation filters into parent id in lists", async () => {
    const listChildRecords = vi.fn(async () => [
      { id: "term_1", contractId: "contract_1" },
      { id: "term_2", contractId: "contract_2" },
    ]);

    const result = await expandRelationFilters({
      sourceEntity: "contract",
      catalog,
      filters: [
        {
          field: "contractTerms.effectiveDate",
          operator: ">=",
          value: { type: "temporal", preset: "today" },
        },
      ],
      listChildRecords,
    });

    expect(listChildRecords).toHaveBeenCalledWith("contractTerms", {
      filter: [
        expect.objectContaining({
          field: "effectiveDate",
          operator: ">=",
        }),
      ],
    });
    expect(result.filters).toEqual([
      {
        field: "id",
        operator: "in",
        value: ["contract_1", "contract_2"],
      },
    ]);
  });

  it("returns empty-result sentinel when child query matches nothing", async () => {
    const result = await expandRelationFilters({
      sourceEntity: "contract",
      catalog,
      filters: [
        {
          field: "contractTerms.effectiveDate",
          operator: ">=",
          value: { type: "temporal", preset: "today" },
        },
      ],
      listChildRecords: vi.fn(async () => []),
    });

    expect(result.emptyResult).toBe(true);
    expect(result.filters).toEqual([
      {
        field: "id",
        operator: "in",
        value: [ENTITY_QUERY_NO_MATCH_ID],
      },
    ]);
  });

  it("keeps flat filters unchanged", async () => {
    const listChildRecords = vi.fn(async () => []);

    const result = await expandRelationFilters({
      sourceEntity: "contract",
      catalog,
      filters: [
        {
          field: "name",
          operator: "==",
          value: { type: "static", value: "Loan" },
        },
      ],
      listChildRecords,
    });

    expect(listChildRecords).not.toHaveBeenCalled();
    expect(result.filters).toEqual([
      {
        field: "name",
        operator: "==",
        value: "Loan",
      },
    ]);
  });
});
