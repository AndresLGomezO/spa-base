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

  it("falls back to populated records when bridged lookup returns null", () => {
    expect(
      resolveEntityFieldPath(
        {
          id: "ps_1",
          financialItemId: "fi_1",
          _populated: {
            financialItemId: { id: "fi_1", name: "Mortgage payment" },
          },
        },
        "financialItem.name",
        {
          ...accountDefinition,
          name: "paymentSchedule",
          fields: {
            financialItemId: {
              type: "reference",
              required: true,
              optional: false,
              relation: { type: "many-to-one", target: "financialItem" },
            },
          },
        } as SerializableEntityDefinition,
        () => null,
        {
          getManyToOneRelationSubfieldValue: () => null,
        },
      ),
    ).toBe("Mortgage payment");
  });

  it("reads many-to-one subfields via bridged lookup when records are not populated", () => {
    expect(
      resolveEntityFieldPath(
        {
          id: "ps_1",
          financialItemId: "fi_1",
        },
        "financialItem.name",
        {
          ...accountDefinition,
          name: "paymentSchedule",
          fields: {
            financialItemId: {
              type: "reference",
              required: true,
              optional: false,
              relation: { type: "many-to-one", target: "financialItem" },
            },
          },
        } as SerializableEntityDefinition,
        () => null,
        {
          getDefinition: (entityName) =>
            entityName === "financialItem"
              ? ({
                  name: "financialItem",
                  collection: "financialItems",
                  permissions: [],
                  fields: {
                    name: { type: "string", required: true, optional: false },
                  },
                  ui: {
                    views: [],
                    forms: { create: { sections: [] }, edit: { sections: [] } },
                    fields: {},
                  },
                } as SerializableEntityDefinition)
              : undefined,
          getManyToOneRelationSubfieldValue: (recordId, fieldPath) => {
            if (recordId !== "ps_1" || fieldPath !== "financialItem.name") {
              return null;
            }
            return "Mortgage payment";
          },
        },
      ),
    ).toBe("Mortgage payment");
  });

  it("reads two-hop relation paths via bridged lookup when records are not populated", () => {
    expect(
      resolveEntityFieldPath(
        {
          id: "ps_1",
          financialItemId: "fi_1",
        },
        "financialItem.actor.logo",
        {
          ...accountDefinition,
          name: "paymentSchedule",
          fields: {
            financialItemId: {
              type: "reference",
              required: true,
              optional: false,
              relation: { type: "many-to-one", target: "financialItem" },
            },
          },
        } as SerializableEntityDefinition,
        () => null,
        {
          getDefinition: (entityName) =>
            entityName === "financialItem"
              ? ({
                  name: "financialItem",
                  collection: "financialItems",
                  permissions: [],
                  fields: {
                    actorId: {
                      type: "reference",
                      required: false,
                      optional: true,
                      relation: { type: "many-to-one", target: "actor" },
                    },
                  },
                  ui: {
                    views: [],
                    forms: { create: { sections: [] }, edit: { sections: [] } },
                    fields: {},
                  },
                } as SerializableEntityDefinition)
              : undefined,
          getManyToOneRelationSubfieldValue: (recordId, fieldPath) => {
            if (
              recordId !== "ps_1" ||
              fieldPath !== "financialItem.actor.logo"
            ) {
              return null;
            }
            return {
              storagePath: "actors/logo.png",
              fileName: "logo.png",
              contentType: "image/png",
            };
          },
        },
      ),
    ).toEqual({
      storagePath: "actors/logo.png",
      fileName: "logo.png",
      contentType: "image/png",
    });
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

  it("reads three-hop relation paths via nested populated records", () => {
    const transactionDefinition = {
      name: "transaction",
      collection: "transactions",
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

    const contractWithProviderBank = {
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

    const bankDefinition = {
      name: "bank",
      collection: "banks",
      permissions: [],
      fields: {
        code: { type: "string", required: true, optional: false },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const getDefinition = (entityName: string) => {
      if (entityName === "contract") {
        return contractWithProviderBank;
      }
      if (entityName === "provider") {
        return providerDefinition;
      }
      if (entityName === "bank") {
        return bankDefinition;
      }
      return undefined;
    };

    expect(
      resolveEntityFieldPath(
        {
          id: "tx_1",
          contractId: "contract_1",
          _populated: {
            contractId: {
              id: "contract_1",
              providerId: "provider_1",
              _populated: {
                providerId: {
                  id: "provider_1",
                  bankId: "bank_1",
                  _populated: {
                    bankId: { id: "bank_1", code: "BOG" },
                  },
                },
              },
            },
          },
        },
        "contract.provider.bank.code",
        transactionDefinition,
        () => null,
        { getDefinition },
      ),
    ).toBe("BOG");
  });
});
