import { describe, expect, it } from "vitest";

import {
  allocateSlotId,
  buildLayoutFromBuilderSlots,
  createBuilderSlotsFromLayout,
  normalizeSlotsForColumnCount,
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

    expect(layout.slots.logo?.imageSize).toBe(56);
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

    expect(layout.slots.status?.badgeVariants).toEqual({
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
