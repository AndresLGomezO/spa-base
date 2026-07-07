import { useTranslation } from "react-i18next";

import {
  ENTITY_QUERY_MODE_BADGE_CLASS,
  ENTITY_QUERY_STATUS_BADGE_CLASS,
  entityQueryModeLabelKey,
  entityQueryStatusLabelKey,
  type EntityQueryModeFilter,
  type EntityQueryStatusFilter,
} from "../entity-query-list-styles";

export function EntityQueryListBadge({
  kind,
  value,
  size = "default",
}: {
  readonly kind: "status" | "queryMode";
  readonly value: EntityQueryStatusFilter | EntityQueryModeFilter;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  const label =
    kind === "status"
      ? t(entityQueryStatusLabelKey(value as EntityQueryStatusFilter))
      : t(entityQueryModeLabelKey(value as EntityQueryModeFilter));

  const badgeClass =
    kind === "status"
      ? ENTITY_QUERY_STATUS_BADGE_CLASS[value as EntityQueryStatusFilter]
      : ENTITY_QUERY_MODE_BADGE_CLASS[value as EntityQueryModeFilter];

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
