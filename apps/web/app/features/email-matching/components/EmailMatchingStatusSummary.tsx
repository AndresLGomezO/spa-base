import { useTranslation } from "react-i18next";

import {
  EMAIL_MATCHING_STATUS_BADGE_CLASS,
  type EmailMatchingStatusFilter,
} from "../email-matching-list-styles";

export function EmailMatchingStatusSummary({
  statusCounts,
  total,
}: {
  readonly statusCounts: Readonly<
    Partial<Record<EmailMatchingStatusFilter, number>>
  >;
  readonly total: number;
}) {
  const { t } = useTranslation("common");

  const statusEntries = (
    Object.entries(statusCounts) as [EmailMatchingStatusFilter, number][]
  ).filter(([, count]) => count > 0);

  if (total <= 0 || statusEntries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1">
      {statusEntries.map(([status, count]) => {
        const percent =
          total > 0 ? Math.round((count / total) * 100) : undefined;

        return (
          <span
            key={`status:${status}`}
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              EMAIL_MATCHING_STATUS_BADGE_CLASS[status]
            }`}
          >
            {t("emailMatchingWorkbench.list.summary", {
              count,
              status:
                status === "enabled"
                  ? t("emailMatchingWorkbench.list.statusEnabled")
                  : t("emailMatchingWorkbench.list.statusDisabled"),
              percent,
            })}
          </span>
        );
      })}
    </div>
  );
}
