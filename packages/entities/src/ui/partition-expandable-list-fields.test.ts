import { describe, expect, it } from "vitest";

import {
  partitionExpandableListFields,
  resolveListImageField,
} from "./partition-expandable-list-fields.js";

const fields = {
  name: { type: "string", required: true, optional: false },
  status: { type: "string", required: false, optional: true },
  amount: { type: "number", required: false, optional: true },
  notes: { type: "string", required: false, optional: true },
  accountId: {
    type: "string",
    required: false,
    optional: true,
    relation: { target: "account", type: "many-to-one" },
  },
} as const;

const fieldsWithLogo = {
  ...fields,
  logo: { type: "image", required: false, optional: true },
} as const;

describe("resolveListImageField", () => {
  it("detects image type fields", () => {
    expect(
      resolveListImageField(fieldsWithLogo, ["name", "logo", "status"]),
    ).toBe("logo");
  });

  it("detects common image field names without field metadata", () => {
    expect(resolveListImageField({}, ["name", "logo", "website"])).toBe("logo");
    expect(resolveListImageField({}, ["name", "image", "website"])).toBe(
      "image",
    );
  });

  it("detects image fields omitted from table field paths", () => {
    const financialItemFields = {
      name: { type: "string", required: true, optional: false },
      flowKind: { type: "enum", required: true, optional: false },
      itemType: { type: "enum", required: true, optional: false },
      image: { type: "image", required: false, optional: true },
    };

    expect(
      resolveListImageField(financialItemFields, [
        "name",
        "flowKind",
        "itemType",
      ]),
    ).toBe("image");
  });
});

describe("partitionExpandableListFields", () => {
  it("partitions 3 fields without expand", () => {
    const result = partitionExpandableListFields(
      ["name", "status", "amount"],
      fields,
    );
    expect(result.imageFieldPath).toBeUndefined();
    expect(result.mainColumnFields).toEqual(["name", "status", "amount"]);
    expect(result.expandFields).toEqual([]);
    expect(result.isExpandable).toBe(false);
  });

  it("partitions logo plus 3 fields without expand", () => {
    const result = partitionExpandableListFields(
      ["logo", "name", "status", "amount"],
      fieldsWithLogo,
    );
    expect(result.imageFieldPath).toBe("logo");
    expect(result.mainColumnFields).toEqual(["name", "status", "amount"]);
    expect(result.expandFields).toEqual([]);
    expect(result.isExpandable).toBe(false);
  });

  it("partitions fields with expand content", () => {
    const result = partitionExpandableListFields(
      ["logo", "name", "status", "amount", "notes", "accountId"],
      fieldsWithLogo,
    );
    expect(result.imageFieldPath).toBe("logo");
    expect(result.mainColumnFields).toEqual(["name", "status", "amount"]);
    expect(result.expandFields).toEqual(["notes", "accountId"]);
    expect(result.isExpandable).toBe(true);
  });

  it("uses image from entity metadata when omitted from table field paths", () => {
    const financialItemFields = {
      name: { type: "string", required: true, optional: false },
      flowKind: { type: "enum", required: true, optional: false },
      itemType: { type: "enum", required: true, optional: false },
      amount: { type: "number", required: false, optional: true },
      image: { type: "image", required: false, optional: true },
    };
    const tableFields = ["name", "flowKind", "itemType", "amount"];

    const result = partitionExpandableListFields(
      tableFields,
      financialItemFields,
    );

    expect(result.imageFieldPath).toBe("image");
    expect(result.mainColumnFields).toEqual(["name", "flowKind", "itemType"]);
    expect(result.expandFields).toEqual(["amount"]);
  });
});
