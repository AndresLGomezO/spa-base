import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  resolveEntityLayoutFieldDefaultImageSrc,
  resolveEntityLayoutImageDownloadTarget,
  resolveEntityLayoutImagePlaceholderSrc,
  resolveEntityLayoutImageSrc,
  resolveEntityLayoutImageStorageDownloadTarget,
  shouldFetchEntityLayoutImageDownload,
} from "./resolve-entity-layout-image-src";

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
    logo: { type: "image", required: false, optional: true },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
} as SerializableEntityDefinition;

describe("resolveEntityLayoutImageSrc", () => {
  it("reads downloadUrl from file references without strict schema validation", () => {
    expect(
      resolveEntityLayoutImageSrc({
        rawValue: {
          storagePath: "tenants/rates/entity-files/bank/abc123.png",
          contentType: "image/png",
          fileName: "banco-bogota.png",
          downloadUrl: "https://example.com/logo.png",
        },
        fieldPath: "bankId.logo",
        definition: accountDefinition,
      }),
    ).toBe("https://example.com/logo.png");
  });
});

describe("resolveEntityLayoutImageSrc with record file reference", () => {
  it("does not return field default when record has storagePath without downloadUrl", () => {
    const bankDefinition = {
      ...accountDefinition,
      name: "bank",
      fields: {
        logo: {
          type: "image",
          required: false,
          optional: true,
          defaultImage: {
            storagePath: "tenants/t1/entity-files/bank/default.png",
            contentType: "image/png",
            fileName: "default.png",
            downloadUrl: "https://example.com/default-logo.png",
          },
        },
      },
    } as SerializableEntityDefinition;

    expect(
      resolveEntityLayoutImageSrc({
        rawValue: {
          storagePath: "tenants/rates/entity-files/bank/abc123.png",
          contentType: "image/png",
          fileName: "banco-bogota.png",
        },
        fieldPath: "bankId.logo",
        definition: accountDefinition,
        getDefinition: (name) => (name === "bank" ? bankDefinition : undefined),
      }),
    ).toBeNull();

    expect(
      resolveEntityLayoutImagePlaceholderSrc({
        fieldPath: "bankId.logo",
        definition: accountDefinition,
        getDefinition: (name) => (name === "bank" ? bankDefinition : undefined),
      }),
    ).toBe("https://example.com/default-logo.png");
  });
});

describe("resolveEntityLayoutFieldDefaultImageSrc", () => {
  it("returns primary field defaultImage without display fallback URLs", () => {
    const bankDefinition = {
      ...accountDefinition,
      name: "bank",
      fields: {
        logo: {
          type: "image",
          required: false,
          optional: true,
          defaultImage: {
            storagePath: "tenants/t1/entity-files/bank/default.png",
            contentType: "image/png",
            fileName: "default.png",
            downloadUrl: "https://example.com/default-logo.png",
          },
        },
      },
    } as SerializableEntityDefinition;

    expect(
      resolveEntityLayoutFieldDefaultImageSrc({
        fieldPath: "bankId.logo",
        definition: accountDefinition,
        getDefinition: (name) => (name === "bank" ? bankDefinition : undefined),
      }),
    ).toBe("https://example.com/default-logo.png");
  });
});

describe("resolveEntityLayoutImageDownloadTarget", () => {
  it("resolves nested relation image fields using the target entity alias", () => {
    expect(
      resolveEntityLayoutImageDownloadTarget({
        item: { id: "acc_1", bankId: "bank_banco_bogota" },
        fieldPath: "bank.logo",
        definition: accountDefinition,
      }),
    ).toEqual({
      entityName: "bank",
      recordId: "bank_banco_bogota",
      fieldName: "logo",
    });
  });

  it("resolves nested relation image fields via foreign key field name", () => {
    expect(
      resolveEntityLayoutImageDownloadTarget({
        item: { id: "acc_1", bankId: "bank_banco_bogota" },
        fieldPath: "bankId.logo",
        definition: accountDefinition,
      }),
    ).toEqual({
      entityName: "bank",
      recordId: "bank_banco_bogota",
      fieldName: "logo",
    });
  });

  it("resolves top-level image fields on the current entity", () => {
    expect(
      resolveEntityLayoutImageDownloadTarget({
        item: { id: "bank_banco_bogota" },
        fieldPath: "logo",
        definition: {
          ...accountDefinition,
          name: "bank",
        },
      }),
    ).toEqual({
      entityName: "bank",
      recordId: "bank_banco_bogota",
      fieldName: "logo",
    });
  });
});

describe("shouldFetchEntityLayoutImageDownload", () => {
  it("does not fetch top-level image fields without a file reference", () => {
    expect(
      shouldFetchEntityLayoutImageDownload({
        item: { id: "rd_prov_06" },
        fieldPath: "logo",
        rawValue: null,
        definition: accountDefinition,
      }),
    ).toBe(false);
  });

  it("fetches top-level image fields with a storagePath reference", () => {
    expect(
      shouldFetchEntityLayoutImageDownload({
        item: { id: "rd_prov_06" },
        fieldPath: "logo",
        rawValue: {
          storagePath: "tenants/t1/entity-files/provider/abc.png",
          fileName: "logo.png",
        },
        definition: accountDefinition,
      }),
    ).toBe(true);
  });

  it("does not fetch populated relation image fields when the target has no file", () => {
    expect(
      shouldFetchEntityLayoutImageDownload({
        item: {
          id: "acc_1",
          bankId: "bank_banco_bogota",
          _populated: {
            bankId: { id: "bank_banco_bogota", logo: null },
          },
        },
        fieldPath: "bankId.logo",
        rawValue: null,
        definition: accountDefinition,
      }),
    ).toBe(false);
  });

  it("fetches unpopulated relation image fields when a foreign key is set", () => {
    expect(
      shouldFetchEntityLayoutImageDownload({
        item: { id: "acc_1", bankId: "bank_banco_bogota" },
        fieldPath: "bankId.logo",
        rawValue: null,
        definition: accountDefinition,
      }),
    ).toBe(true);
  });

  it("fetches relation image fields when the path uses the target entity alias", () => {
    expect(
      shouldFetchEntityLayoutImageDownload({
        item: { id: "acc_1", bankId: "bank_banco_bogota" },
        fieldPath: "bank.logo",
        rawValue: null,
        definition: accountDefinition,
      }),
    ).toBe(true);
  });

  it("resolves nested relation image download targets from populated records", () => {
    const transactionDefinition = {
      name: "transaction",
      collection: "transactions",
      permissions: [],
      fields: {
        contractId: {
          type: "reference",
          required: true,
          optional: false,
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
        logo: { type: "image", required: false, optional: true },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    expect(
      resolveEntityLayoutImageDownloadTarget({
        item: {
          id: "tx_1",
          contractId: "contract_1",
          _populated: {
            contractId: {
              id: "contract_1",
              providerId: "provider_1",
              _populated: {
                providerId: { id: "provider_1", logo: null },
              },
            },
          },
        },
        fieldPath: "contract.provider.logo",
        definition: transactionDefinition,
        getDefinition: (entityName) => {
          if (entityName === "contract") {
            return contractDefinition;
          }
          if (entityName === "provider") {
            return providerDefinition;
          }
          return undefined;
        },
      }),
    ).toEqual({
      entityName: "provider",
      recordId: "provider_1",
      fieldName: "logo",
    });
  });

  it("does not resolve nested relation image downloads without populated records", () => {
    const paymentScheduleDefinition = {
      name: "paymentSchedule",
      collection: "paymentSchedules",
      permissions: [],
      fields: {
        financialItemId: {
          type: "reference",
          required: true,
          optional: false,
          relation: { type: "many-to-one", target: "financialItem" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const financialItemDefinition = {
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
    } as SerializableEntityDefinition;

    const actorDefinition = {
      name: "actor",
      collection: "actors",
      permissions: [],
      fields: {
        logo: { type: "image", required: false, optional: true },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const getDefinition = (entityName: string) => {
      if (entityName === "financialItem") {
        return financialItemDefinition;
      }
      if (entityName === "actor") {
        return actorDefinition;
      }
      return undefined;
    };

    expect(
      resolveEntityLayoutImageDownloadTarget({
        item: {
          id: "ps_1",
          financialItemId: "fi_1",
        },
        fieldPath: "financialItem.actor.logo",
        definition: paymentScheduleDefinition,
        getDefinition,
      }),
    ).toBeNull();

    expect(
      shouldFetchEntityLayoutImageDownload({
        item: {
          id: "ps_1",
          financialItemId: "fi_1",
        },
        fieldPath: "financialItem.actor.logo",
        rawValue: null,
        definition: paymentScheduleDefinition,
        getDefinition,
      }),
    ).toBe(false);
  });

  it("fetches nested relation image fields from merged populated records", () => {
    const paymentScheduleDefinition = {
      name: "paymentSchedule",
      collection: "paymentSchedules",
      permissions: [],
      fields: {
        financialItemId: {
          type: "reference",
          required: true,
          optional: false,
          relation: { type: "many-to-one", target: "financialItem" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const financialItemDefinition = {
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
    } as SerializableEntityDefinition;

    const actorDefinition = {
      name: "actor",
      collection: "actors",
      permissions: [],
      fields: {
        logo: { type: "image", required: false, optional: true },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
        fields: {},
      },
    } as SerializableEntityDefinition;

    const getDefinition = (entityName: string) => {
      if (entityName === "financialItem") {
        return financialItemDefinition;
      }
      if (entityName === "actor") {
        return actorDefinition;
      }
      return undefined;
    };

    expect(
      shouldFetchEntityLayoutImageDownload({
        item: {
          id: "ps_1",
          financialItemId: "fi_1",
          _populated: {
            financialItemId: {
              id: "fi_1",
              actorId: "actor_1",
              _populated: {
                actorId: {
                  id: "actor_1",
                  logo: {
                    storagePath: "actors/logo.png",
                    fileName: "logo.png",
                    contentType: "image/png",
                  },
                },
              },
            },
          },
        },
        fieldPath: "financialItem.actor.logo",
        rawValue: null,
        definition: paymentScheduleDefinition,
        getDefinition,
      }),
    ).toBe(true);
  });
});

describe("resolveEntityLayoutImageStorageDownloadTarget", () => {
  it("resolves one-to-many child image file references by storage path", () => {
    const contractDefinition = {
      ...accountDefinition,
      name: "contract",
      fields: {
        contractTerms: {
          type: "relation",
          required: false,
          optional: true,
          relation: { type: "one-to-many", target: "contractTerms" },
        },
      },
    } as SerializableEntityDefinition;

    expect(
      resolveEntityLayoutImageStorageDownloadTarget({
        fieldPath: "contractTerms.logo",
        definition: contractDefinition,
        rawValue: {
          storagePath: "tenants/t1/entity-files/contractTerms/logo.png",
          fileName: "logo.png",
        },
      }),
    ).toEqual({
      entityName: "contractTerms",
      storagePath: "tenants/t1/entity-files/contractTerms/logo.png",
    });
  });
});
