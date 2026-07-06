import { useTranslation } from "react-i18next";

import {
  CUSTOM_VIEW_STATUS_BADGE_CLASS,
  type CustomViewStatusFilter,
} from "../custom-view-list-styles";

export function CustomViewListBadge({
  status,
  size = "default",
}: {
  readonly status: CustomViewStatusFilter;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  const sizeClass =
    size === "compact"
      ? "px-1.5 py-0 text-[10px] leading-4"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-medium ${sizeClass} ${CUSTOM_VIEW_STATUS_BADGE_CLASS[status]}`}
    >
      {status === "ACTIVE"
        ? t("customViews.list.statusActive")
        : t("customViews.list.statusPaused")}
    </span>
  );
}
