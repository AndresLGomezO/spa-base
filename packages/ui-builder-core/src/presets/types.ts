export type UiBuilderPresetKind =
  | "layout-document"
  | "column"
  | "grid-track"
  | "component-row";

export type UiBuilderFieldSlotKind = "dataSourceField" | "formFieldPath";

export interface UiBuilderFieldSlot {
  readonly id: string;
  readonly kind: UiBuilderFieldSlotKind;
  readonly label?: string;
  readonly jsonPath: string;
  readonly sourceHint?: string;
}

export const UI_BUILDER_SLOT_TOKEN_PREFIX = "$slot:";

export function uiBuilderSlotToken(slotId: string): string {
  return `${UI_BUILDER_SLOT_TOKEN_PREFIX}${slotId}`;
}

export function isUiBuilderSlotToken(value: string): boolean {
  return value.startsWith(UI_BUILDER_SLOT_TOKEN_PREFIX);
}

export function parseUiBuilderSlotToken(value: string): string | null {
  if (!isUiBuilderSlotToken(value)) {
    return null;
  }
  const slotId = value.slice(UI_BUILDER_SLOT_TOKEN_PREFIX.length);
  return slotId.length > 0 ? slotId : null;
}
