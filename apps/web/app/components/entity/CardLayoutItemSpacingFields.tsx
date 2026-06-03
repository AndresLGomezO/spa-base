import {
  LAYOUT_SPACING_KEYS,
  LAYOUT_SPACING_MAX_PX,
  LAYOUT_SPACING_MIN_PX,
  type LayoutSpacingKey,
} from "@repo/entities";
import { Input, Text } from "@repo/ui";

import type { BuilderSlotItemDraft } from "./card-layout-builder-state";

export interface CardLayoutItemSpacingFieldsProps {
  readonly item: BuilderSlotItemDraft;
  readonly labels: {
    readonly spacing: string;
    readonly spacingHint: string;
    readonly marginX: string;
    readonly marginY: string;
    readonly marginTop: string;
    readonly marginBottom: string;
    readonly marginLeft: string;
    readonly marginRight: string;
    readonly padding: string;
  };
  readonly onChange: (
    field: LayoutSpacingKey,
    value: number | undefined,
  ) => void;
}

const SPACING_LABELS: Record<
  LayoutSpacingKey,
  keyof CardLayoutItemSpacingFieldsProps["labels"]
> = {
  marginX: "marginX",
  marginY: "marginY",
  marginTop: "marginTop",
  marginBottom: "marginBottom",
  marginLeft: "marginLeft",
  marginRight: "marginRight",
  padding: "padding",
};

function parseSpacingInput(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return Math.max(
    LAYOUT_SPACING_MIN_PX,
    Math.min(LAYOUT_SPACING_MAX_PX, parsed),
  );
}

export function CardLayoutItemSpacingFields({
  item,
  labels,
  onChange,
}: CardLayoutItemSpacingFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Text className="text-xs font-medium">{labels.spacing}</Text>
        <Text variant="muted" className="text-xs">
          {labels.spacingHint}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUT_SPACING_KEYS.map((field) => (
          <label key={field} className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {labels[SPACING_LABELS[field]]}
            </span>
            <Input
              type="number"
              min={LAYOUT_SPACING_MIN_PX}
              max={LAYOUT_SPACING_MAX_PX}
              value={item[field] === undefined ? "" : String(item[field])}
              onChange={(event) =>
                onChange(field, parseSpacingInput(event.target.value))
              }
              className="w-full"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
