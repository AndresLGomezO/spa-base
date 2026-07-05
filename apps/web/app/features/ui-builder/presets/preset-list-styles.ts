import type { PresetSourceFilter } from "./preset-catalog-entry";

export type PresetListSort = "nameAsc" | "nameDesc" | "source" | "updatedDesc";

export const DEFAULT_PRESET_LIST_SORT: PresetListSort = "nameAsc";

export const PRESET_SOURCE_FILTERS: readonly PresetSourceFilter[] = [
  "platform",
  "tenant",
];

export const PRESET_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const PRESET_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export const PRESET_SOURCE_BADGE_CLASS: Record<PresetSourceFilter, string> = {
  platform: "bg-badge-info text-badge-info-foreground",
  tenant: "bg-badge-default text-badge-default-foreground",
};

export function isPresetListSort(value: string): value is PresetListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "source" ||
    value === "updatedDesc"
  );
}

export function presetSourceLabelKey(
  source: PresetSourceFilter,
): `designLayout.presets.list.source${"Platform" | "Tenant"}` {
  return source === "platform"
    ? "designLayout.presets.list.sourcePlatform"
    : "designLayout.presets.list.sourceTenant";
}

export function presetSortLabelKey(
  sort: PresetListSort,
): `designLayout.presets.list.sort${"NameAsc" | "NameDesc" | "Source" | "UpdatedDesc"}` {
  switch (sort) {
    case "nameDesc":
      return "designLayout.presets.list.sortNameDesc";
    case "source":
      return "designLayout.presets.list.sortSource";
    case "updatedDesc":
      return "designLayout.presets.list.sortUpdatedDesc";
    case "nameAsc":
    default:
      return "designLayout.presets.list.sortNameAsc";
  }
}
