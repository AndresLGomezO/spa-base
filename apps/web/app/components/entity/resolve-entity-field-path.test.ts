import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  resolveEntityFieldAccessRoot,
  resolveEntityFieldPath,
} from "./resolve-entity-field-path";

const accountDefinition = {
  name: "account",
  collection: "accounts",
  permissions: [],
  fields: {
    bankId: {
      type: "reference",
      required: false,
      optional: true,
      relation: { type: "many-to-one", target: "bank" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

describe("resolveEntityFieldPath", () => {
  it("reads nested fields via relation target alias bank.name", () => {
    expect(
      resolveEntityFieldPath(
        {
          id: "acc_1",
          bankId: "bank_bogota",
          _populated: {
            bankId: { id: "bank_bogota", name: "Banco de Bogotá" },
          },
        },
        "bank.name",
        accountDefinition,
        () => null,
      ),
    ).toBe("Banco de Bogotá");
  });

  it("reads two-hop relation paths via nested populated records", () => {
    const paymentDefinition = {
      name: "payment",
      collection: "payments",
      permissions: [],
      fields: {
        contractId: {
          type: "reference",
          required: false,
          optional: true,
          relation: { type: "many-to-one", target: "contract" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const contractDefinition = {
      name: "contract",
      collection: "contracts",
      permissions: [],
      fields: {
        providerId: {
          type: "reference",
          required: false,
          optional: true,
          relation: { type: "many-to-one", target: "provider" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const providerDefinition = {
      name: "provider",
      collection: "providers",
      permissions: [],
      fields: {
        name: { type: "string", required: true, optional: false },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const getDefinition = (entityName: string) => {
      if (entityName === "contract") {
        return contractDefinition;
      }
      if (entityName === "provider") {
        return providerDefinition;
      }
      return undefined;
    };

    expect(
      resolveEntityFieldPath(
        {
          id: "pay_1",
          contractId: "contract_1",
          _populated: {
            contractId: {
              id: "contract_1",
              providerId: "provider_1",
              _populated: {
                providerId: { id: "provider_1", name: "Acme Provider" },
              },
            },
          },
        },
        "contract.provider.name",
        paymentDefinition,
        () => null,
        { getDefinition },
      ),
    ).toBe("Acme Provider");
  });

  it("resolves ACL root from relation alias for dotted display paths", () => {
    expect(resolveEntityFieldAccessRoot(accountDefinition, "bank.name")).toBe(
      "bankId",
    );
  });
});
