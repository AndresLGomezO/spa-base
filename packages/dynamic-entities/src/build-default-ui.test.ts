import { describe, expect, it } from "vitest";
import { resolveLayoutRootColumns } from "@repo/ui-builder-core";

import { buildDefaultUiForNewDefinition } from "./define-entity-from-record.js";

function readFormFieldPaths(
  layout: NonNullable<
    NonNullable<
      ReturnType<typeof buildDefaultUiForNewDefinition>["forms"]
    >["create"]["layout"]
  >,
): string[] {
  return resolveLayoutRootColumns(layout).flatMap((column) =>
    column.rows.flatMap((row) => {
      if (row.type === "component" && row.component.kind === "form-field") {
        return [row.component.fieldPath];
      }
      return [];
    }),
  );
}

describe("buildDefaultUiForNewDefinition", () => {
  it("builds table, forms, and field metadata without nav icon", () => {
    const ui = buildDefaultUiForNewDefinition({
      label: "Loans",
      fields: [
        { name: "amount", type: "number" },
        { name: "title", type: "string" },
      ],
    });

    expect(ui.nav).toEqual({ label: "Loans" });
    expect(ui.views).toHaveLength(1);
    expect(readFormFieldPaths(ui.forms!.create.layout!)).toEqual([
      "amount",
      "title",
    ]);
    expect(ui.fields?.amount.component).toBe("number");
    expect(ui.fields?.title.component).toBe("input");
  });

  it("includes nav.icon when navIcon is provided", () => {
    const ui = buildDefaultUiForNewDefinition({
      label: "Loans",
      fields: [{ name: "title", type: "string" }],
      navIcon: "  Box  ",
    });

    expect(ui.nav).toEqual({ label: "Loans", icon: "Box" });
    expect(ui.views).toHaveLength(1);
  });
});
