import type { UiBuilderPresetRecord } from "@repo/entities";
import { BUILT_IN_TEMPLATE_DEFINITIONS } from "@repo/ui-builder-core";
import type { TFunction } from "i18next";

import {
  builtinPresetDescription,
  builtinPresetLabel,
} from "../layout-system-preset-labels";
import type { PresetCatalogEntry } from "./preset-catalog-entry";

export function buildPresetCatalogEntries(
  tenantPresets: readonly UiBuilderPresetRecord[],
  t: TFunction,
): readonly PresetCatalogEntry[] {
  const platformEntries: PresetCatalogEntry[] =
    BUILT_IN_TEMPLATE_DEFINITIONS.map((definition) => ({
      id: `platform:${definition.id}`,
      source: "platform",
      name: builtinPresetLabel(t, definition.id),
      description:
        builtinPresetDescription(t, definition.id) ?? definition.description,
      kind: "layout-document",
      surfaces: definition.surfaces,
      isDefault: definition.isDefault,
      fieldSlotCount: 0,
      builtinId: definition.id,
    }));

  const tenantEntries: PresetCatalogEntry[] = tenantPresets.map((preset) => ({
    id: `tenant:${preset.id}`,
    source: "tenant",
    name: preset.name,
    description: preset.description,
    kind: preset.kind,
    designSurface: preset.designSurface,
    fieldSlotCount: preset.fieldSlots.length,
    updatedAt: preset.updatedAt,
    tenantPreset: preset,
  }));

  return [...platformEntries, ...tenantEntries];
}
