import { useTranslation } from "react-i18next";

import {
  FORMULA_SOURCE_BADGE_CLASS,
  FORMULA_STATUS_BADGE_CLASS,
  formulaSourceLabelKey,
  formulaStatusLabelKey,
  type FormulaSourceFilter,
  type FormulaStatusFilter,
} from "../formula-list-styles";

export function FormulaListBadge({
  kind,
  value,
  size = "default",
}: {
  readonly kind: "source" | "status";
  readonly value: FormulaSourceFilter | FormulaStatusFilter;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  const label =
    kind === "source"
      ? t(formulaSourceLabelKey(value as FormulaSourceFilter))
      : t(formulaStatusLabelKey(value as FormulaStatusFilter));

  const badgeClass =
    kind === "source"
      ? FORMULA_SOURCE_BADGE_CLASS[value as FormulaSourceFilter]
      : FORMULA_STATUS_BADGE_CLASS[value as FormulaStatusFilter];

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
