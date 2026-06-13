import type { ComponentProps } from "react";

import { cn } from "@repo/theme/utils";

import { WebDataViewToolbar } from "../data-view/WebDataViewToolbar";
import {
  ENTITY_PAGE_CHROME_TRANSITION,
  useEntityPageScrollCompact,
} from "./entity-page-scroll-compact";

interface EntityPageCompactToolbarProps {
  readonly toolbar: Omit<ComponentProps<typeof WebDataViewToolbar>, "compact">;
}

export function EntityPageCompactToolbar({
  toolbar,
}: EntityPageCompactToolbarProps) {
  const { isCompact, compactProgress } = useEntityPageScrollCompact();
  const showCompactToolbar = isCompact && toolbar.activeBadges.length === 0;
  const expandedOpacity = 1 - compactProgress;
  const compactOpacity = compactProgress;

  return (
    <div
      className={cn(
        "relative z-20 shrink-0",
        ENTITY_PAGE_CHROME_TRANSITION,
        showCompactToolbar && "max-lg:hidden",
      )}
    >
      <div
        className={cn(
          ENTITY_PAGE_CHROME_TRANSITION,
          isCompact &&
            "max-lg:pointer-events-none max-lg:absolute max-lg:inset-x-0 max-lg:opacity-0",
        )}
        style={
          compactProgress > 0 && !isCompact
            ? { opacity: expandedOpacity }
            : undefined
        }
        aria-hidden={isCompact ? true : undefined}
      >
        <WebDataViewToolbar
          {...toolbar}
          compact={false}
          transitionClassName={ENTITY_PAGE_CHROME_TRANSITION}
        />
      </div>

      {!showCompactToolbar ? (
        <div
          className={cn(
            ENTITY_PAGE_CHROME_TRANSITION,
            isCompact
              ? "max-lg:relative max-lg:opacity-100"
              : "max-lg:pointer-events-none max-lg:absolute max-lg:inset-x-0 max-lg:top-0 max-lg:opacity-0",
          )}
          style={
            compactProgress > 0 && !isCompact
              ? { opacity: compactOpacity }
              : undefined
          }
          aria-hidden={!isCompact ? true : undefined}
        >
          <WebDataViewToolbar
            {...toolbar}
            compact
            transitionClassName={ENTITY_PAGE_CHROME_TRANSITION}
          />
        </div>
      ) : null}
    </div>
  );
}
