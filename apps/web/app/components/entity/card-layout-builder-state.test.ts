import { describe, expect, it } from "vitest";

import {
  allocateSlotId,
  buildLayoutFromBuilderSlots,
  createBuilderSlotsFromLayout,
  getItemChildren,
  getItemInnerColumns,
  getSlotInnerColumns,
  getSlotItems,
  isItemGroup,
  mapSlotItemTree,
  normalizeItemInnerColumnCount,
  normalizeSlotInnerColumnCount,
  normalizeSlotsForColumnCount,
  removeBuilderColumn,
  swapBuilderColumns,
  swapSlotInnerColumns,
  type BuilderSlotDraft,
} from "./card-layout-builder-state";

const slot = (
  overrides: Partial<BuilderSlotDraft> & Pick<BuilderSlotDraft, "slotId">,
): BuilderSlotDraft => ({
  fieldPath: "name",
  component: "text",
  column: 0,
  order: 0,
  ...overrides,
});

describe("normalizeSlotsForColumnCount", () => {
  it("moves slots from removed columns to the last column", () => {
    const result = normalizeSlotsForColumnCount(
      [
        slot({ slotId: "a", column: 0, order: 0 }),
        slot({ slotId: "b", column: 3, order: 0 }),
      ],
      2,
    );

    expect(result.find((entry) => entry.slotId === "b")?.column).toBe(1);
  });

  it("reindexes order within each column", () => {
    const result = normalizeSlotsForColumnCount(
      [
        slot({ slotId: "a", column: 1, order: 5 }),
        slot({ slotId: "b", column: 1, order: 2 }),
      ],
      4,
    );

    expect(
      result.filter((entry) => entry.column === 1).map((entry) => entry.order),
    ).toEqual([0, 1]);
  });

  it("round-trips image size for image slots", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "logo",
          fieldPath: "bankId.logo",
          component: "image",
          imageSize: 56,
        }),
      ],
      { columns: 1 },
    );

    expect(
      layout.slots.logo &&
        "imageSize" in layout.slots.logo &&
        layout.slots.logo.imageSize,
    ).toBe(56);
    expect(createBuilderSlotsFromLayout(layout)[0]?.imageSize).toBe(56);
  });

  it("round-trips badge variant rules", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "status",
          fieldPath: "statusId",
          component: "badge",
          badgeVariantRules: [
            { matchValue: "ACTIVE", variant: "success" },
            { matchValue: "CLOSED", variant: "danger" },
            { matchValue: "PAUSED", variant: "warning" },
          ],
        }),
      ],
      { columns: 1 },
    );

    expect(
      layout.slots.status &&
        "badgeVariants" in layout.slots.status &&
        layout.slots.status.badgeVariants,
    ).toEqual({
      ACTIVE: "success",
      CLOSED: "danger",
      PAUSED: "warning",
    });

    const restored = createBuilderSlotsFromLayout(layout);
    expect(restored[0]?.badgeVariantRules).toEqual([
      { matchValue: "ACTIVE", variant: "success" },
      { matchValue: "CLOSED", variant: "danger" },
      { matchValue: "PAUSED", variant: "warning" },
    ]);
  });

  it("round-trips text styling for text slots", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "title",
          fieldPath: "name",
          textSize: 18,
          textThin: true,
          textItalic: true,
          textUnderline: true,
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots.title).toMatchObject({
      textSize: 18,
      textThin: true,
      textItalic: true,
      textUnderline: true,
    });

    expect(createBuilderSlotsFromLayout(layout)[0]).toMatchObject({
      textSize: 18,
      textThin: true,
      textItalic: true,
      textUnderline: true,
    });
  });

  it("round-trips slot align and justify", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "logo",
          fieldPath: "bankId.logo",
          component: "image",
          column: 0,
          align: "center",
          justify: "start",
        }),
      ],
      { columns: 2 },
    );

    const restored = createBuilderSlotsFromLayout(layout);
    expect(restored[0]).toMatchObject({
      align: "center",
      justify: "start",
    });
  });

  it("persists cardsPerRow on the layout config", () => {
    const layout = buildLayoutFromBuilderSlots([slot({ slotId: "name" })], {
      columns: 1,
      cardsPerRow: 3,
    });

    expect(layout.cardsPerRow).toBe(3);
  });

  it("round-trips metric-kpi slot bindings", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "revenue-kpi",
          component: "metric-kpi",
          metricDefinitionId: "metric-1",
          groupBindings: {
            month: { type: "static", value: "2026-06" },
          },
          dimensionBindings: {
            categoryId: { type: "entityField", fieldPath: "categoryId" },
          },
          label: "Revenue",
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots["revenue-kpi"]).toMatchObject({
      component: "metric-kpi",
      metricDefinitionId: "metric-1",
      groupBindings: {
        month: { type: "static", value: "2026-06" },
      },
      dimensionBindings: {
        categoryId: { type: "entityField", fieldPath: "categoryId" },
      },
      label: "Revenue",
    });

    const restored = createBuilderSlotsFromLayout(layout);
    expect(restored[0]).toMatchObject({
      component: "metric-kpi",
      metricDefinitionId: "metric-1",
      groupBindings: {
        month: { type: "static", value: "2026-06" },
      },
      dimensionBindings: {
        categoryId: { type: "entityField", fieldPath: "categoryId" },
      },
      label: "Revenue",
    });
  });
  it("round-trips label position for labeled text slots", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "title",
          fieldPath: "name",
          showLabel: true,
          labelPosition: "below",
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots.title).toMatchObject({
      showLabel: true,
      labelPosition: "below",
    });

    expect(createBuilderSlotsFromLayout(layout)[0]).toMatchObject({
      showLabel: true,
      labelPosition: "below",
    });
  });

  it("round-trips static text and text color for text slots", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "note",
          component: "text",
          fieldPath: "",
          staticText: "Featured account",
          textColor: "primary",
          textBold: true,
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots.note).toMatchObject({
      component: "text",
      staticText: "Featured account",
      textColor: "primary",
      textBold: true,
    });

    expect(createBuilderSlotsFromLayout(layout)[0]).toMatchObject({
      staticText: "Featured account",
      textColor: "primary",
      textBold: true,
    });
  });

  it("round-trips date slot bindings", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "opened",
          fieldPath: "openDate",
          component: "date",
          dateDisplayFormat: "date",
          showLabel: true,
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots.opened).toMatchObject({
      component: "date",
      dateDisplayFormat: "date",
      showLabel: true,
    });

    expect(createBuilderSlotsFromLayout(layout)[0]).toMatchObject({
      component: "date",
      dateDisplayFormat: "date",
      showLabel: true,
    });
  });

  it("round-trips slot groups with inner columns", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "group-1",
          innerColumns: 3,
          items: [
            {
              itemId: "left",
              innerColumn: 0,
              innerOrder: 0,
              fieldPath: "name",
              component: "text",
            },
            {
              itemId: "middle",
              innerColumn: 1,
              innerOrder: 0,
              fieldPath: "statusId",
              component: "badge",
            },
            {
              itemId: "right",
              innerColumn: 2,
              innerOrder: 0,
              fieldPath: "amount",
              component: "currency",
            },
          ],
        }),
      ],
      { columns: 1 },
    );

    expect(layout.root.type === "grid" && layout.root.children[0]?.type).toBe(
      "stack",
    );
    expect(
      layout.root.type === "grid" &&
        layout.root.children[0]?.type === "stack" &&
        layout.root.children[0].children[0]?.type,
    ).toBe("grid");
    expect(layout.slots.left?.component).toBe("text");
    expect(layout.slots.middle?.component).toBe("badge");
    expect(layout.slots.right?.component).toBe("currency");

    const restored = createBuilderSlotsFromLayout(layout);
    expect(restored).toHaveLength(1);
    expect(getSlotInnerColumns(restored[0]!)).toBe(3);
    expect(getSlotItems(restored[0]!)).toHaveLength(3);
  });

  it("round-trips nested inner columns on child items", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "parent",
          items: [
            {
              itemId: "child-group",
              innerColumn: 0,
              innerOrder: 0,
              innerColumns: 2,
              items: [
                {
                  itemId: "child-left",
                  innerColumn: 0,
                  innerOrder: 0,
                  fieldPath: "name",
                  component: "text",
                },
                {
                  itemId: "child-right",
                  innerColumn: 1,
                  innerOrder: 0,
                  fieldPath: "amount",
                  component: "currency",
                },
              ],
              fieldPath: "name",
              component: "text",
            },
          ],
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots["child-left"]?.component).toBe("text");
    expect(layout.slots["child-right"]?.component).toBe("currency");

    const restored = createBuilderSlotsFromLayout(layout);
    const parentItem = getSlotItems(restored[0]!)[0]!;
    expect(getItemInnerColumns(parentItem)).toBe(2);
    expect(getItemChildren(parentItem)).toHaveLength(2);
    expect(isItemGroup(parentItem)).toBe(true);
  });

  it("preserves showLabel false on items in multi-column slots", () => {
    const source = slot({
      slotId: "group",
      showLabel: true,
      innerColumns: 2,
      items: [
        {
          itemId: "left",
          innerColumn: 0,
          innerOrder: 0,
          fieldPath: "name",
          component: "text",
          showLabel: true,
        },
        {
          itemId: "right",
          innerColumn: 1,
          innerOrder: 0,
          fieldPath: "amount",
          component: "currency",
          showLabel: true,
        },
      ],
    });

    const normalized = normalizeSlotInnerColumnCount(
      {
        ...source,
        items: mapSlotItemTree(getSlotItems(source), "left", (item) => ({
          ...item,
          showLabel: false,
        })),
      },
      2,
    );

    expect(getSlotItems(normalized)[0]?.showLabel).toBe(false);
    expect(normalized.showLabel).toBeUndefined();

    const layout = buildLayoutFromBuilderSlots([normalized], { columns: 1 });
    expect(layout.slots.left?.showLabel).toBe(false);

    const restored = createBuilderSlotsFromLayout(layout);
    expect(getSlotItems(restored[0]!)[0]?.showLabel).toBe(false);
  });

  it("updates nested child bindings when an item gains inner columns", () => {
    const source = slot({
      slotId: "parent",
      innerColumns: 2,
      items: [
        {
          itemId: "child",
          innerColumn: 0,
          innerOrder: 0,
          fieldPath: "name",
          component: "text",
          showLabel: true,
        },
      ],
    });

    const withItemColumns = normalizeSlotInnerColumnCount(
      {
        ...source,
        items: mapSlotItemTree(getSlotItems(source), "child", (item) =>
          normalizeItemInnerColumnCount(item, 2),
        ),
      },
      2,
    );

    const groupedItem = getSlotItems(withItemColumns)[0]!;
    expect(groupedItem.itemId).toBe("child__group");
    expect(getItemChildren(groupedItem)[0]?.itemId).toBe("child");

    const updated = normalizeSlotInnerColumnCount(
      {
        ...withItemColumns,
        items: mapSlotItemTree(getSlotItems(withItemColumns), "child", (item) => ({
          ...item,
          showLabel: false,
        })),
      },
      2,
    );

    expect(getItemChildren(getSlotItems(updated)[0]!)[0]?.showLabel).toBe(
      false,
    );
  });

  it("round-trips spacing fields on slot items", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "title",
          fieldPath: "name",
          component: "text",
          marginX: 8,
          marginTop: 4,
          padding: 6,
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots.title).toMatchObject({
      marginX: 8,
      marginTop: 4,
      padding: 6,
    });
    expect(layout.root.type === "grid" && layout.root.children[0]?.type).toBe(
      "slot",
    );
    if (layout.root.type === "grid" && layout.root.children[0]?.type === "slot") {
      expect(layout.root.children[0]).toMatchObject({
        marginX: 8,
        marginTop: 4,
        padding: 6,
      });
    }

    expect(createBuilderSlotsFromLayout(layout)[0]).toMatchObject({
      marginX: 8,
      marginTop: 4,
      padding: 6,
    });
  });

  it("round-trips fallback field paths for field-based slots", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "logo",
          component: "image",
          fieldPath: "bankId.logo",
          fallbackFieldPaths: ["providerId.logo"],
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots.logo).toMatchObject({
      fieldPath: "bankId.logo",
      fallbackFieldPaths: ["providerId.logo"],
    });

    expect(createBuilderSlotsFromLayout(layout)[0]).toMatchObject({
      fieldPath: "bankId.logo",
      fallbackFieldPaths: ["providerId.logo"],
    });
  });

  it("round-trips per-item horizontal align", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "group-1",
          align: "start",
          items: [
            {
              itemId: "left",
              innerColumn: 0,
              innerOrder: 0,
              fieldPath: "name",
              component: "text",
              align: "end",
            },
            {
              itemId: "right",
              innerColumn: 0,
              innerOrder: 1,
              fieldPath: "statusId",
              component: "badge",
              align: "center",
            },
          ],
        }),
      ],
      { columns: 1 },
    );

    expect(layout.slots.left).toMatchObject({ align: "end" });
    expect(layout.slots.right).toMatchObject({ align: "center" });

    const restored = createBuilderSlotsFromLayout(layout);
    expect(getSlotItems(restored[0]!)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: "left", align: "end" }),
        expect.objectContaining({ itemId: "right", align: "center" }),
      ]),
    );
  });

  it("preserves slot align and justify when building multi-item groups", () => {
    const layout = buildLayoutFromBuilderSlots(
      [
        slot({
          slotId: "group-1",
          align: "end",
          justify: "start",
          items: [
            {
              itemId: "top",
              innerColumn: 0,
              innerOrder: 0,
              fieldPath: "name",
              component: "text",
            },
            {
              itemId: "bottom",
              innerColumn: 0,
              innerOrder: 1,
              fieldPath: "statusId",
              component: "badge",
            },
          ],
        }),
      ],
      { columns: 1 },
    );

    const columnNode =
      layout.root.type === "grid" ? layout.root.children[0] : undefined;
    expect(columnNode?.type).toBe("stack");
    expect(columnNode).toMatchObject({
      align: "end",
      justify: "start",
    });
    const innerGrid =
      columnNode?.type === "stack" ? columnNode.children[0] : undefined;
    const innerStack =
      innerGrid?.type === "grid" ? innerGrid.children[0] : undefined;
    expect(innerStack).toMatchObject({
      type: "stack",
      align: "stretch",
    });
    expect(innerStack?.type === "stack" && innerStack.children[0]).toMatchObject({
      align: "end",
    });
    expect(innerStack?.type === "stack" && innerStack.children[1]).toMatchObject({
      align: "end",
    });

    const restored = createBuilderSlotsFromLayout(layout);
    expect(restored[0]).toMatchObject({
      align: "end",
      justify: "start",
    });
    expect(getSlotItems(restored[0]!)).toHaveLength(2);
  });

  it("round-trips all properties on every inner column item including nested groups", () => {
    let source = slot({
      slotId: "parent",
      innerColumns: 1,
      items: [
        {
          itemId: "child",
          innerColumn: 0,
          innerOrder: 0,
          fieldPath: "name",
          component: "text",
          showLabel: true,
          staticText: "Left text",
        },
      ],
    });

    source = normalizeSlotInnerColumnCount(
      {
        ...source,
        items: mapSlotItemTree(getSlotItems(source), "child", (item) =>
          normalizeItemInnerColumnCount(item, 2),
        ),
      },
      1,
    );

    const groupItem = getSlotItems(source)[0]!;
    source = normalizeSlotInnerColumnCount(
      {
        ...source,
        items: mapSlotItemTree(getSlotItems(source), groupItem.itemId, (group) =>
          normalizeItemInnerColumnCount(
            {
              ...group,
              items: [
                ...getItemChildren(group),
                {
                  itemId: "child-right",
                  innerColumn: 1,
                  innerOrder: 0,
                  fieldPath: "amount",
                  component: "currency",
                  showLabel: false,
                  label: "Total",
                  marginTop: 12,
                },
              ],
            },
            2,
          ),
        ),
      },
      1,
    );

    const layout = buildLayoutFromBuilderSlots([source], { columns: 1 });
    expect(layout.slots["child-right"]).toMatchObject({
      fieldPath: "amount",
      component: "currency",
      showLabel: false,
      label: "Total",
      marginTop: 12,
    });

    const restored = createBuilderSlotsFromLayout(layout);
    const restoredGroup = getSlotItems(restored[0]!)[0]!;
    const restoredChildren = getItemChildren(restoredGroup);
    expect(restoredChildren).toHaveLength(2);
    expect(restoredChildren[0]).toMatchObject({
      itemId: "child",
      fieldPath: "name",
      staticText: "Left text",
    });
    expect(restoredChildren[1]).toMatchObject({
      itemId: "child-right",
      innerColumn: 1,
      fieldPath: "amount",
      component: "currency",
      showLabel: false,
      label: "Total",
      marginTop: 12,
    });
  });

  it("round-trips second slot-level inner column item properties", () => {
    const source = slot({
      slotId: "parent",
      innerColumns: 2,
      items: [
        {
          itemId: "left",
          innerColumn: 0,
          innerOrder: 0,
          fieldPath: "name",
          component: "text",
          showLabel: true,
          staticText: "Hello",
        },
        {
          itemId: "right",
          innerColumn: 1,
          innerOrder: 0,
          fieldPath: "amount",
          component: "currency",
          showLabel: false,
          label: "Amt",
          marginTop: 8,
        },
      ],
    });

    const layout = buildLayoutFromBuilderSlots([source], { columns: 1 });
    const restored = createBuilderSlotsFromLayout(layout);
    const items = getSlotItems(restored[0]!);
    expect(items).toHaveLength(2);
    expect(items.find((entry) => entry.itemId === "right")).toMatchObject({
      innerColumn: 1,
      fieldPath: "amount",
      component: "currency",
      showLabel: false,
      label: "Amt",
      marginTop: 8,
    });
  });

  it("round-trips leaf and nested group stacked in the same inner column", () => {
    const source = slot({
      slotId: "parent",
      innerColumns: 1,
      items: [
        {
          itemId: "first",
          innerColumn: 0,
          innerOrder: 0,
          fieldPath: "name",
          component: "text",
          showLabel: true,
        },
        {
          itemId: "second__group",
          innerColumn: 0,
          innerOrder: 1,
          innerColumns: 2,
          items: [
            {
              itemId: "second-left",
              innerColumn: 0,
              innerOrder: 0,
              fieldPath: "statusId",
              component: "badge",
              showLabel: false,
            },
            {
              itemId: "second-right",
              innerColumn: 1,
              innerOrder: 0,
              fieldPath: "amount",
              component: "currency",
              label: "Total",
            },
          ],
          fieldPath: "statusId",
          component: "badge",
        },
      ],
    });

    const layout = buildLayoutFromBuilderSlots([source], { columns: 1 });
    expect(layout.slots["second-right"]).toMatchObject({
      fieldPath: "amount",
      component: "currency",
      label: "Total",
    });

    const restored = createBuilderSlotsFromLayout(layout);
    const restoredItems = getSlotItems(restored[0]!);
    expect(restoredItems).toHaveLength(2);
    expect(restoredItems[0]).toMatchObject({
      itemId: "first",
      fieldPath: "name",
      showLabel: true,
    });

    const restoredGroup = restoredItems[1]!;
    expect(isItemGroup(restoredGroup)).toBe(true);
    expect(getItemChildren(restoredGroup)[1]).toMatchObject({
      itemId: "second-right",
      innerColumn: 1,
      fieldPath: "amount",
      component: "currency",
      label: "Total",
    });
  });

  it("preserves inner column index when an earlier inner column is empty", () => {
    const source = slot({
      slotId: "parent",
      innerColumns: 2,
      items: [
        {
          itemId: "right-only",
          innerColumn: 1,
          innerOrder: 0,
          fieldPath: "amount",
          component: "currency",
          showLabel: false,
          label: "Amount",
        },
      ],
    });

    const layout = buildLayoutFromBuilderSlots([source], { columns: 1 });
    const restored = createBuilderSlotsFromLayout(layout);
    expect(getSlotItems(restored[0]!)).toEqual([
      expect.objectContaining({
        itemId: "right-only",
        innerColumn: 1,
        fieldPath: "amount",
        label: "Amount",
      }),
    ]);
  });
});

describe("removeBuilderColumn", () => {
  it("removes slots in the deleted column and shifts later columns left", () => {
    const slots = [
      slot({ slotId: "a", column: 0, order: 0 }),
      slot({ slotId: "b", column: 1, order: 0 }),
      slot({ slotId: "c", column: 1, order: 1 }),
      slot({ slotId: "d", column: 2, order: 0 }),
    ];

    const result = removeBuilderColumn(slots, 1, 3);

    expect(result.map((entry) => entry.slotId)).toEqual(["a", "d"]);
    expect(result.find((entry) => entry.slotId === "d")?.column).toBe(1);
  });

  it("reindexes order within remaining columns", () => {
    const slots = [
      slot({ slotId: "a", column: 0, order: 0 }),
      slot({ slotId: "b", column: 0, order: 1 }),
    ];

    const result = removeBuilderColumn(slots, 1, 2);

    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.order)).toEqual([0, 1]);
  });

  it("does nothing when only one column remains", () => {
    const slots = [slot({ slotId: "a", column: 0, order: 0 })];

    expect(removeBuilderColumn(slots, 0, 1)).toEqual(slots);
  });

  it("round-trips through layout build and parse", () => {
    const result = removeBuilderColumn(
      [
        slot({ slotId: "left", column: 0, order: 0, fieldPath: "name" }),
        slot({ slotId: "middle", column: 1, order: 0, fieldPath: "statusId" }),
        slot({ slotId: "right", column: 2, order: 0, fieldPath: "amount" }),
      ],
      1,
      3,
    );

    const layout = buildLayoutFromBuilderSlots(result, { columns: 2 });
    const restored = createBuilderSlotsFromLayout(layout);

    expect(restored.find((entry) => entry.slotId === "middle")).toBeUndefined();
    expect(restored.find((entry) => entry.slotId === "left")?.column).toBe(0);
    expect(restored.find((entry) => entry.slotId === "right")?.column).toBe(1);
  });
});

describe("swapBuilderColumns", () => {
  it("exchanges slot column values between two columns", () => {
    const slots = [
      slot({ slotId: "a", column: 0, order: 0 }),
      slot({ slotId: "b", column: 1, order: 0 }),
      slot({ slotId: "c", column: 1, order: 1 }),
    ];

    const swapped = swapBuilderColumns(slots, 0, 1);

    expect(swapped.find((entry) => entry.slotId === "a")?.column).toBe(1);
    expect(swapped.find((entry) => entry.slotId === "b")?.column).toBe(0);
    expect(swapped.find((entry) => entry.slotId === "c")?.column).toBe(0);
  });

  it("preserves order within each column", () => {
    const slots = [
      slot({ slotId: "a", column: 0, order: 0 }),
      slot({ slotId: "b", column: 1, order: 0 }),
      slot({ slotId: "c", column: 1, order: 1 }),
    ];

    const swapped = swapBuilderColumns(slots, 0, 1);

    expect(
      swapped
        .filter((entry) => entry.column === 0)
        .map((entry) => entry.order),
    ).toEqual([0, 1]);
    expect(swapped.find((entry) => entry.slotId === "a")?.order).toBe(0);
  });

  it("round-trips swapped column order through layout build and parse", () => {
    const swapped = swapBuilderColumns(
      [
        slot({ slotId: "left", column: 0, order: 0, fieldPath: "name" }),
        slot({ slotId: "right", column: 1, order: 0, fieldPath: "statusId" }),
      ],
      0,
      1,
    );

    const layout = buildLayoutFromBuilderSlots(swapped, { columns: 2 });
    const restored = createBuilderSlotsFromLayout(layout);

    expect(restored.find((entry) => entry.slotId === "left")?.column).toBe(1);
    expect(restored.find((entry) => entry.slotId === "right")?.column).toBe(0);
  });
});

describe("allocateSlotId", () => {
  it("does not reuse numeric slot ids after a slot is removed", () => {
    const afterDelete: readonly BuilderSlotDraft[] = [
      slot({ slotId: "slot-1", order: 0 }),
      slot({ slotId: "slot-3", order: 1 }),
    ];

    expect(allocateSlotId(afterDelete)).toBe("slot-4");
  });

  it("skips occupied numeric ids when max suffix is taken", () => {
    const slots: readonly BuilderSlotDraft[] = [
      slot({ slotId: "slot-1" }),
      slot({ slotId: "slot-4" }),
    ];

    expect(allocateSlotId(slots)).toBe("slot-5");
  });

  it("coexists with semantic slot ids from saved layouts", () => {
    const slots: readonly BuilderSlotDraft[] = [
      slot({ slotId: "logo" }),
      slot({ slotId: "balance-amount", order: 1 }),
      slot({ slotId: "slot-2", order: 2 }),
    ];

    expect(allocateSlotId(slots)).toBe("slot-3");
  });
});
