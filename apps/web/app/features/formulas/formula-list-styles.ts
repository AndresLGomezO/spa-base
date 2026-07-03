export type FormulaListSort = "nameAsc" | "nameDesc" | "source" | "updatedDesc";

export type FormulaSourceFilter = "platform" | "tenant";

export type FormulaStatusFilter = "enabled" | "disabled";

export const DEFAULT_FORMULA_LIST_SORT: FormulaListSort = "nameAsc";

export const FORMULA_SOURCE_FILTERS: readonly FormulaSourceFilter[] = [
  "platform",
  "tenant",
];

export const FORMULA_STATUS_FILTERS: readonly FormulaStatusFilter[] = [
  "enabled",
  "disabled",
];

export const FORMULA_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const FORMULA_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export const FORMULA_SOURCE_BADGE_CLASS: Record<FormulaSourceFilter, string> = {
  platform: "bg-badge-info text-badge-info-foreground",
  tenant: "bg-badge-default text-badge-default-foreground",
};

export const FORMULA_STATUS_BADGE_CLASS: Record<FormulaStatusFilter, string> = {
  enabled: "bg-badge-success text-badge-success-foreground",
  disabled: "bg-badge-default text-badge-default-foreground",
};

export function isFormulaListSort(value: string): value is FormulaListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "source" ||
    value === "updatedDesc"
  );
}

export function formulaSourceLabelKey(
  source: FormulaSourceFilter,
): `formulas.list.source${"Platform" | "Tenant"}` {
  return source === "platform"
    ? "formulas.list.sourcePlatform"
    : "formulas.list.sourceTenant";
}

export function formulaStatusLabelKey(
  status: FormulaStatusFilter,
): `formulas.list.status${"Enabled" | "Disabled"}` {
  return status === "enabled"
    ? "formulas.list.statusEnabled"
    : "formulas.list.statusDisabled";
}

export function formulaSortLabelKey(
  sort: FormulaListSort,
): `formulas.list.sort${"NameAsc" | "NameDesc" | "Source" | "UpdatedDesc"}` {
  switch (sort) {
    case "nameDesc":
      return "formulas.list.sortNameDesc";
    case "source":
      return "formulas.list.sortSource";
    case "updatedDesc":
      return "formulas.list.sortUpdatedDesc";
    case "nameAsc":
    default:
      return "formulas.list.sortNameAsc";
  }
}
