import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { IconButton } from "@repo/ui";

import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "../../components/entity/entity-layout-image-placeholder";
import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import type { GlobalSearchHit } from "./global-search-types";

interface GlobalSearchResultRowProps {
  readonly hit: GlobalSearchHit;
  readonly onSelect: (hit: GlobalSearchHit) => void;
  readonly onRemove?: (hitId: string) => void;
}

export function GlobalSearchResultRow({
  hit,
  onSelect,
  onRemove,
}: GlobalSearchResultRowProps) {
  const { t } = useTranslation("common");
  const Icon =
    !hit.imageUrl && hit.iconName ? resolveLucideIcon(hit.iconName) : null;

  return (
    <div
      className="group hover:bg-hover/80 focus-within:bg-hover/80 flex w-full items-center gap-1 rounded-lg"
      data-testid={`global-search-result-${hit.id}`}
    >
      <button
        type="button"
        onClick={() => onSelect(hit)}
        className="focus-visible:ring-focus/40 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {hit.imageUrl ? (
            <img
              src={hit.imageUrl}
              alt=""
              className="size-full object-cover"
              data-testid={`global-search-result-image-${hit.id}`}
            />
          ) : Icon ? (
            <Icon className="size-4" aria-hidden />
          ) : (
            <img
              src={ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC}
              alt=""
              className="size-full object-cover"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground block truncate text-sm font-medium">
            {hit.label}
          </span>
          {hit.description ? (
            <span className="text-muted-foreground block truncate text-xs">
              {hit.description}
            </span>
          ) : null}
        </span>
      </button>
      {onRemove ? (
        <IconButton
          type="button"
          size="sm"
          label={t("globalSearch.removeRecent", { label: hit.label })}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove(hit.id);
          }}
          className="mr-1 size-7 opacity-70 group-hover:opacity-100"
          data-testid={`global-search-remove-recent-${hit.id}`}
        >
          <X className="size-3.5" strokeWidth={2.5} aria-hidden />
        </IconButton>
      ) : null}
    </div>
  );
}
