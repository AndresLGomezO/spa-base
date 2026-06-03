import { describe, expect, it } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  resolveEntityLayoutFieldDefaultImageSrc,
  resolveEntityLayoutImageDownloadTarget,
  resolveEntityLayoutImagePlaceholderSrc,
  resolveEntityLayoutImageSrc,
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
  it("resolves nested relation image fields to the target entity record", () => {
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
