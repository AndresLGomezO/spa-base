import { describe, expect, it } from "vitest";

import {
  parseEntityCreateFormPrefill,
  stripEntityFormModalSearchParams,
} from "./parse-entity-create-form-prefill.js";

const definition = {
  name: "order",
  fields: {
    id: { type: "string" },
    accountId: { type: "string" },
    notes: { type: "string" },
  },
  ui: { fields: {} },
} as const;

describe("parseEntityCreateFormPrefill", () => {
  it("reads field params and ignores reserved keys", () => {
    const params = new URLSearchParams(
      "create&accountId=account-1&notes=hello&q=search&f.status=Open&page=2&unknown=skip",
    );

    expect(parseEntityCreateFormPrefill(params, definition as never)).toEqual({
      accountId: "account-1",
      notes: "hello",
    });
  });

  it("ignores empty values", () => {
    const params = new URLSearchParams("create&accountId=%20%20&notes=hello");

    expect(parseEntityCreateFormPrefill(params, definition as never)).toEqual({
      notes: "hello",
    });
  });
});

describe("stripEntityFormModalSearchParams", () => {
  it("removes create, edit, and entity field params", () => {
    const params = new URLSearchParams(
      "create&edit=rec-1&accountId=account-1&notes=hello&q=search&f.status=Open",
    );

    expect(
      stripEntityFormModalSearchParams(params, definition as never).toString(),
    ).toBe("q=search&f.status=Open");
  });
});
