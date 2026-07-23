export type EmailMatchingListSort =
  | "nameAsc"
  | "nameDesc"
  | "entity"
  | "updatedDesc"
  | "orderAsc";

export type EmailMatchingStatusFilter = "enabled" | "disabled";

export type EmailMatchingIngestModeFilter = "create" | "link";

export type EmailMatchingUseAiFilter = "ai" | "rules";

export const DEFAULT_EMAIL_MATCHING_LIST_SORT: EmailMatchingListSort =
  "nameAsc";

export const EMAIL_MATCHING_STATUS_FILTERS: readonly EmailMatchingStatusFilter[] =
  ["enabled", "disabled"];

export const EMAIL_MATCHING_INGEST_MODE_FILTERS: readonly EmailMatchingIngestModeFilter[] =
  ["create", "link"];

export const EMAIL_MATCHING_USE_AI_FILTERS: readonly EmailMatchingUseAiFilter[] =
  ["ai", "rules"];

export const EMAIL_MATCHING_LIST_ROW_HOVER_CLASS = "hover:bg-muted/50";
export const EMAIL_MATCHING_LIST_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15 ring-primary ring-2 ring-inset";

export const EMAIL_MATCHING_STATUS_BADGE_CLASS: Record<
  EmailMatchingStatusFilter,
  string
> = {
  enabled: "bg-badge-success text-badge-success-foreground",
  disabled: "bg-badge-default text-badge-default-foreground",
};

export const EMAIL_MATCHING_INGEST_BADGE_CLASS: Record<
  EmailMatchingIngestModeFilter,
  string
> = {
  create: "bg-badge-info text-badge-info-foreground",
  link: "bg-badge-default text-badge-default-foreground",
};

export const EMAIL_MATCHING_AI_BADGE_CLASS: Record<
  EmailMatchingUseAiFilter,
  string
> = {
  ai: "bg-badge-info text-badge-info-foreground",
  rules: "bg-badge-default text-badge-default-foreground",
};

export const EMAIL_MATCHING_ENTITY_BADGE_CLASS =
  "bg-badge-default text-badge-default-foreground";

export function isEmailMatchingListSort(
  value: string,
): value is EmailMatchingListSort {
  return (
    value === "nameAsc" ||
    value === "nameDesc" ||
    value === "entity" ||
    value === "updatedDesc" ||
    value === "orderAsc"
  );
}
