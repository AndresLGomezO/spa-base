import { useTranslation } from "react-i18next";

import {
  EMAIL_MATCHING_AI_BADGE_CLASS,
  EMAIL_MATCHING_ENTITY_BADGE_CLASS,
  EMAIL_MATCHING_INGEST_BADGE_CLASS,
  EMAIL_MATCHING_STATUS_BADGE_CLASS,
  type EmailMatchingIngestModeFilter,
  type EmailMatchingStatusFilter,
  type EmailMatchingUseAiFilter,
} from "../email-matching-list-styles";

export function EmailMatchingListBadge({
  kind,
  value,
  size = "default",
}: {
  readonly kind: "status" | "ingestMode" | "useAi" | "entity";
  readonly value: string;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  let label = value;
  let badgeClass = EMAIL_MATCHING_ENTITY_BADGE_CLASS;

  if (kind === "status") {
    const status = value as EmailMatchingStatusFilter;
    label =
      status === "enabled"
        ? t("emailMatchingWorkbench.list.statusEnabled")
        : t("emailMatchingWorkbench.list.statusDisabled");
    badgeClass = EMAIL_MATCHING_STATUS_BADGE_CLASS[status];
  } else if (kind === "ingestMode") {
    const mode = value as EmailMatchingIngestModeFilter;
    label =
      mode === "create"
        ? t("emailMatchingWorkbench.list.ingestCreate")
        : t("emailMatchingWorkbench.list.ingestLink");
    badgeClass = EMAIL_MATCHING_INGEST_BADGE_CLASS[mode];
  } else if (kind === "useAi") {
    const filter = value as EmailMatchingUseAiFilter;
    label =
      filter === "ai"
        ? t("emailMatchingWorkbench.list.useAiOn")
        : t("emailMatchingWorkbench.list.useAiOff");
    badgeClass = EMAIL_MATCHING_AI_BADGE_CLASS[filter];
  }

  const sizeClass =
    size === "compact"
      ? "px-1.5 py-0 text-[10px] leading-4"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-medium ${sizeClass} ${badgeClass}`}
    >
      {label}
    </span>
  );
}
