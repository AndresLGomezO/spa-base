import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "../../components/entity/entity-layout-image-placeholder";
import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import { getGlobalSearchHitKind } from "./global-search-hit-tabs";
import type { GlobalSearchHit } from "./global-search-types";

interface GlobalSearchResultsRowProps {
  readonly hit: GlobalSearchHit;
  readonly onNavigate?: () => void;
}

export function GlobalSearchResultsRow({
  hit,
  onNavigate,
}: GlobalSearchResultsRowProps) {
  const { t } = useTranslation("common");
  const Icon =
    !hit.imageUrl && hit.iconName ? resolveLucideIcon(hit.iconName) : null;

  let badge: string;
  if (hit.entityName) {
    badge = hit.description ?? hit.entityName;
  } else {
    switch (getGlobalSearchHitKind(hit)) {
      case "features":
        badge = t("globalSearch.results.badges.feature");
        break;
      case "views":
        badge = t("globalSearch.results.badges.view");
        break;
      case "types":
        badge = t("globalSearch.results.badges.type");
        break;
      case "records":
        badge = hit.description ?? t("globalSearch.results.badges.record");
        break;
    }
  }

  return (
    <li
      className="hover:bg-hover/40 flex items-start gap-3 px-3 py-3"
      data-testid={`global-search-results-row-${hit.id}`}
    >
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {hit.imageUrl ? (
          <img src={hit.imageUrl} alt="" className="size-full object-cover" />
        ) : Icon ? (
          <Icon className="size-5" aria-hidden />
        ) : (
          <img
            src={ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC}
            alt=""
            className="size-full object-cover"
          />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={hit.to}
            onClick={onNavigate}
            className="text-primary text-sm font-medium hover:underline"
          >
            {hit.label}
          </Link>
          <span className="border-border bg-muted text-muted-foreground inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">
            {badge}
          </span>
        </div>
        {hit.snippet ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {hit.snippet}
          </p>
        ) : hit.description && getGlobalSearchHitKind(hit) !== "records" ? (
          <p className="text-muted-foreground text-sm">{hit.description}</p>
        ) : null}
      </div>
    </li>
  );
}
