import { useTranslation } from "react-i18next";

import {
  CUSTOM_VIEW_STATUS_BADGE_CLASS,
  type CustomViewStatusFilter,
} from "../custom-view-list-styles";

export function CustomViewStatusSummary({
  statusCounts,
  total,
}: {
  readonly statusCounts: Readonly<
    Partial<Record<CustomViewStatusFilter, number>>
  >;
  readonly total: number;
}) {
  const { t } = useTranslation("common");

  const statusEntries = (
    Object.entries(statusCounts) as [CustomViewStatusFilter, number][]
  ).filter(([, count]) => count > 0);

  if (total <= 0 || statusEntries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1">
      {statusEntries.map(([status, count]) => {
        const percent =
          total > 0 ? Math.round((count / total) * 100) : undefined;
        const statusLabel =
          status === "ACTIVE"
            ? t("customViews.list.statusActive")
            : t("customViews.list.statusPaused");

        return (
          <span
            key={`status:${status}`}
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              CUSTOM_VIEW_STATUS_BADGE_CLASS[status]
            }`}
          >
            {t("customViews.list.summary", {
              count,
              status: statusLabel,
              percent,
            })}
          </span>
        );
      })}
    </div>
  );
}
