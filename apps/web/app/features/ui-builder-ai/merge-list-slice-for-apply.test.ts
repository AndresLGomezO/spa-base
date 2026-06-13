import { describe, expect, it } from "vitest";
import { createDefaultUiLayout } from "@repo/ui-builder-core";

import type { ListSliceData } from "@repo/entities";

import { mergeListSliceForApply } from "./merge-list-slice-for-apply";

function slice(overrides: Partial<ListSliceData> = {}): ListSliceData {
  const layout = createDefaultUiLayout(["name"]);
  return {
    listViewType: "table",
    table: { fields: ["name", "status"], showActions: true },
    expandableTable: {
      columns: [{ id: "col-1", cellLayout: layout }],
      rowExpandLayout: layout,
      showActions: true,
    },
    ...overrides,
  };
}

describe("mergeListSliceForApply", () => {
  it("preserves current table config when applying a card suggestion", () => {
    const current = slice({
      listViewType: "table",
      table: { fields: ["name", "status", "amount"], showActions: false },
    });
    const incoming = slice({
      listViewType: "card",
      listItem: createDefaultUiLayout(["name"]),
    });

    const merged = mergeListSliceForApply(current, incoming);

    expect(merged.listViewType).toBe("card");
    expect(merged.table.fields).toEqual(["name", "status", "amount"]);
    expect(merged.table.showActions).toBe(false);
    expect(merged.listItem).toEqual(incoming.listItem);
  });

  it("applies expandable table branch when that presentation is selected", () => {
    const layout = createDefaultUiLayout(["email"]);
    const current = slice();
    const incoming = slice({
      listViewType: "expandableTable",
      expandableTable: {
        columns: [{ id: "col-new", cellLayout: layout }],
        rowExpandLayout: layout,
        showActions: false,
      },
    });

    const merged = mergeListSliceForApply(current, incoming);

    expect(merged.listViewType).toBe("expandableTable");
    expect(merged.expandableTable.columns[0]?.id).toBe("col-new");
    expect(merged.table.fields).toEqual(current.table.fields);
  });
});
