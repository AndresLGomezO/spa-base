import { describe, expect, it } from "vitest";

import {
  getEntityCellRawValue,
  getEntityCellSchemaValue,
  resolveEntityCellValue,
} from "./resolve-entity-cell-value";

describe("resolveEntityCellValue", () => {
  it("uses reverse lookup value for one-to-many columns", () => {
    const definition = {
      name: "batch",
      collection: "batches",
      permissions: [],
      fields: {
        workItems: {
          type: "relation",
          required: false,
          optional: true,
          relation: { target: "workItem", type: "one-to-many" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    };

    expect(
      resolveEntityCellValue(
        { id: "batch_1" },
        "workItems",
        definition,
        () => "Item A, Item B",
      ),
    ).toBe("Item A, Item B");
  });

  it("falls back to stored field values for other columns", () => {
    const definition = {
      name: "batch",
      collection: "batches",
      permissions: [],
      fields: {
        name: { type: "string", required: true, optional: false },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    };

    expect(
      resolveEntityCellValue(
        { id: "batch_1", name: "Batch A" },
        "name",
        definition,
        () => null,
      ),
    ).toBe("Batch A");
  });

  it("keeps plain text with numbers as-is for string fields", () => {
    const definition = {
      name: "batch",
      collection: "batches",
      permissions: [],
      fields: {
        name: { type: "string", required: true, optional: false },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    };

    expect(
      resolveEntityCellValue(
        { id: "batch_1", name: "test 1" },
        "name",
        definition,
        () => null,
      ),
    ).toBe("test 1");
  });

  it("uses populated labels for display but foreign keys for raw values", () => {
    const definition = {
      name: "account",
      collection: "accounts",
      permissions: [],
      fields: {
        accountTypeId: {
          type: "relation",
          required: true,
          optional: false,
          relation: { target: "accountType", type: "many-to-one" },
        },
      },
      ui: {
        views: [],
        forms: { create: { sections: [] }, edit: { sections: [] } },
      },
    };

    const item = {
      id: "acc_1",
      accountTypeId: "atype_wallet",
      _populated: {
        accountTypeId: { id: "atype_wallet", name: "Digital Wallet" },
      },
    };

    expect(
      getEntityCellRawValue(item, "accountTypeId", definition, () => null),
    ).toBe("atype_wallet");
    expect(
      resolveEntityCellValue(item, "accountTypeId", definition, () => null),
    ).toBe("Digital Wallet");
    expect(
      getEntityCellSchemaValue(item, "accountTypeId", definition, () => null),
    ).toBe("Digital Wallet");
  });
});
