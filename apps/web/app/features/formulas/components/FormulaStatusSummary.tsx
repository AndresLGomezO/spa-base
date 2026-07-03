import { useTranslation } from "react-i18next";

import {
  FORMULA_SOURCE_BADGE_CLASS,
  FORMULA_STATUS_BADGE_CLASS,
  formulaSourceLabelKey,
  formulaStatusLabelKey,
  type FormulaSourceFilter,
  type FormulaStatusFilter,
} from "../formula-list-styles";

export function FormulaStatusSummary({
  sourceCounts,
  statusCounts,
  total,
}: {
  readonly sourceCounts: Readonly<Partial<Record<FormulaSourceFilter, number>>>;
  readonly statusCounts: Readonly<Partial<Record<FormulaStatusFilter, number>>>;
  readonly total: number;
}) {
  const { t } = useTranslation("common");

  const sourceEntries = (
    Object.entries(sourceCounts) as [FormulaSourceFilter, number][]
  ).filter(([, count]) => count > 0);

  const statusEntries = (
    Object.entries(statusCounts) as [FormulaStatusFilter, number][]
  ).filter(([, count]) => count > 0);

  const showSourceSummary = sourceEntries.length > 1;

  if (total <= 0 || (statusEntries.length === 0 && !showSourceSummary)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1">
      {showSourceSummary
        ? sourceEntries.map(([source, count]) => {
            const percent =
              total > 0 ? Math.round((count / total) * 100) : undefined;

            return (
              <span
                key={`source:${source}`}
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  FORMULA_SOURCE_BADGE_CLASS[source]
                }`}
              >
                {t("formulas.list.summary", {
                  count,
                  status: t(formulaSourceLabelKey(source)),
                  percent,
                })}
              </span>
            );
          })
        : null}
      {statusEntries.map(([status, count]) => {
        const percent =
          total > 0 ? Math.round((count / total) * 100) : undefined;

        return (
          <span
            key={`status:${status}`}
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              FORMULA_STATUS_BADGE_CLASS[status]
            }`}
          >
            {t("formulas.list.summary", {
              count,
              status: t(formulaStatusLabelKey(status)),
              percent,
            })}
          </span>
        );
      })}
    </div>
  );
}
