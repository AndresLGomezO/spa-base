import { describe, expect, it } from "vitest";

import type { FieldPathValidationDefinition } from "./field-paths.js";
import {
  collectNestedRelationLayoutFieldPaths,
  resolveLayoutFieldLeaf,
} from "./layout-field-leaf.js";

describe("resolveLayoutFieldLeaf", () => {
  const transactionDefinition: FieldPathValidationDefinition = {
    name: "transaction",
    fields: {
      contractId: {
        relation: { type: "many-to-one", target: "contract" },
      },
    },
  };

  const contractDefinition: FieldPathValidationDefinition = {
    name: "contract",
    fields: {
      name: {},
      providerId: {
        relation: { type: "many-to-one", target: "provider" },
      },
    },
  };

  const providerDefinition: FieldPathValidationDefinition = {
    name: "provider",
    fields: {
      name: {},
      logo: { type: "image" },
    },
  };

  const bankDefinition: FieldPathValidationDefinition = {
    name: "bank",
    fields: {
      code: {},
    },
  };

  const providerWithBankDefinition: FieldPathValidationDefinition = {
    name: "provider",
    fields: {
      name: {},
      logo: { type: "image" },
      bankId: {
        relation: { type: "many-to-one", target: "bank" },
      },
    },
  };

  const resolveTarget = (
    target: string,
  ): FieldPathValidationDefinition | undefined => {
    if (target === "contract") {
      return contractDefinition;
    }
    if (target === "provider") {
      return providerDefinition;
    }
    if (target === "bank") {
      return bankDefinition;
    }
    return undefined;
  };

  it("resolves two-hop leaf fields", () => {
    expect(
      resolveLayoutFieldLeaf(
        transactionDefinition,
        "contract.provider.name",
        resolveTarget,
      ),
    ).toMatchObject({
      rootRelationField: "contractId",
      leafFieldName: "name",
      leafEntityName: "provider",
      pathPrefix: "contract.provider",
    });
  });

  it("collects paths up to three relation hops", () => {
    const transactionWithBank: FieldPathValidationDefinition = {
      name: "transaction",
      fields: {
        contractId: {
          relation: { type: "many-to-one", target: "contract" },
        },
      },
    };

    const contractWithProviderBank: FieldPathValidationDefinition = {
      name: "contract",
      fields: {
        providerId: {
          relation: { type: "many-to-one", target: "provider" },
        },
      },
    };

    const options = collectNestedRelationLayoutFieldPaths(
      contractWithProviderBank,
      {
        resolveTarget: (target) => {
          if (target === "provider") {
            return providerWithBankDefinition;
          }
          if (target === "bank") {
            return bankDefinition;
          }
          return undefined;
        },
      },
      new Set<string>(),
      "contract",
      1,
    );

    expect(options.has("contract.provider.logo")).toBe(true);
    expect(options.has("contract.provider.bank.code")).toBe(true);
    expect(
      resolveLayoutFieldLeaf(
        transactionWithBank,
        "contract.provider.bank.code",
        (target) => {
          if (target === "contract") {
            return contractWithProviderBank;
          }
          if (target === "provider") {
            return providerWithBankDefinition;
          }
          if (target === "bank") {
            return bankDefinition;
          }
          return undefined;
        },
      ),
    ).toMatchObject({
      leafFieldName: "code",
      leafEntityName: "bank",
    });
  });
});
