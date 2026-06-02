import type { CardLayoutConfig, CardSlotBinding, LayoutNode } from "./types.js";

export function createDefaultCardLayout(
  fieldPaths: readonly string[],
): CardLayoutConfig {
  const slots: Record<string, CardSlotBinding> = {};
  const infoChildren: LayoutNode[] = fieldPaths.slice(0, 4).map((fieldPath) => {
    const slotId = `field-${fieldPath}`;
    slots[slotId] = {
      component: "text",
      fieldPath,
      showLabel: true,
    };
    return {
      type: "slot" as const,
      slotId,
    };
  });

  const root: LayoutNode = {
    type: "grid",
    direction: "row",
    gap: 16,
    columns: 2,
    align: "start",
    children: [
      {
        type: "stack",
        direction: "column",
        gap: 8,
        flex: 1,
        children: infoChildren,
      },
      {
        type: "slot",
        slotId: "primary",
        align: "end",
        flex: 1,
      },
    ],
  };

  if (fieldPaths.length > 0) {
    slots.primary = {
      component: "text",
      fieldPath: fieldPaths[0] ?? "name",
      className: "text-right font-semibold",
    };
  }

  return {
    root,
    slots,
    showActions: true,
  };
}

export function createFourColumnFinancialLayout(
  slots: CardLayoutConfig["slots"],
): CardLayoutConfig {
  return {
    showActions: true,
    slots,
    root: {
      type: "grid",
      direction: "row",
      gap: 16,
      columns: 4,
      align: "center",
      children: [
        {
          type: "slot",
          slotId: "logo",
          align: "center",
          minWidth: 48,
          maxWidth: 64,
        },
        {
          type: "stack",
          direction: "column",
          gap: 4,
          flex: 1,
          children: Object.keys(slots)
            .filter((id) => id.startsWith("info-"))
            .map((slotId) => ({
              type: "slot" as const,
              slotId,
            })),
        },
        {
          type: "stack",
          direction: "column",
          gap: 4,
          flex: 1,
          align: "end",
          children: Object.keys(slots)
            .filter((id) => id.startsWith("balance-"))
            .map((slotId) => ({
              type: "slot" as const,
              slotId,
            })),
        },
        {
          type: "slot",
          slotId: "status",
          align: "end",
        },
      ],
    },
  };
}
