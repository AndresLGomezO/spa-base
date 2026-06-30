import { describe, expect, it } from "vitest";

import {
  applyCreateFormPrefill,
  coerceCreateFormPrefillValue,
} from "./coerce-create-form-prefill-value.js";

describe("coerceCreateFormPrefillValue", () => {
  it("coerces numeric prefill values to numbers", () => {
    expect(
      coerceCreateFormPrefillValue(
        {
          type: "number",
          numberKind: "decimal",
          required: false,
          optional: true,
        },
        "42.5",
      ),
    ).toBe(42.5);
    expect(
      coerceCreateFormPrefillValue(
        {
          type: "number",
          numberKind: "integer",
          required: false,
          optional: true,
        },
        "7",
      ),
    ).toBe(7);
  });

  it("rejects invalid numeric prefill values", () => {
    expect(
      coerceCreateFormPrefillValue(
        {
          type: "number",
          numberKind: "integer",
          required: false,
          optional: true,
        },
        "7.5",
      ),
    ).toBeUndefined();
    expect(
      coerceCreateFormPrefillValue(
        {
          type: "number",
          numberKind: "decimal",
          required: false,
          optional: true,
        },
        "abc",
      ),
    ).toBeUndefined();
  });

  it("coerces boolean and enum prefill values", () => {
    expect(
      coerceCreateFormPrefillValue(
        { type: "boolean", required: false, optional: true },
        "true",
      ),
    ).toBe(true);
    expect(
      coerceCreateFormPrefillValue(
        { type: "boolean", required: false, optional: true },
        "false",
      ),
    ).toBe(false);
    expect(
      coerceCreateFormPrefillValue(
        {
          type: "enum",
          enumValues: ["draft", "posted"],
          required: false,
          optional: true,
        },
        "draft",
      ),
    ).toBe("draft");
  });
});

describe("applyCreateFormPrefill", () => {
  it("writes coerced values into initial form state", () => {
    const initial: Record<string, unknown> = { amount: "" };
    const definition = {
      name: "order",
      fields: {
        amount: { type: "number", numberKind: "decimal" },
        active: { type: "boolean" },
      },
      ui: { fields: {} },
    } as const;

    applyCreateFormPrefill(definition as never, initial, {
      amount: "12.5",
      active: "true",
    });

    expect(initial).toEqual({
      amount: 12.5,
      active: true,
    });
  });
});
