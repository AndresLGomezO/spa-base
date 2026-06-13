import { CirclePlus } from "lucide-react";

import { Button, Heading, IconButton } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  ENTITY_PAGE_CHROME_TRANSITION,
  useEntityPageScrollCompact,
} from "./entity-page-scroll-compact";

interface EntityPageCompactHeaderProps {
  readonly entityLabel: string;
  readonly canConfigureView: boolean;
  readonly canCreate: boolean;
  readonly designLayoutLabel: string;
  readonly createLabel: string;
  readonly onOpenDesignLayout: () => void;
  readonly onCreate: () => void;
}

export function EntityPageCompactHeader({
  entityLabel,
  canConfigureView,
  canCreate,
  designLayoutLabel,
  createLabel,
  onOpenDesignLayout,
  onCreate,
}: EntityPageCompactHeaderProps) {
  const { compactProgress, isCompact } = useEntityPageScrollCompact();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 max-lg:gap-2",
        isCompact && "max-lg:gap-1.5",
      )}
    >
      <Heading
        level={1}
        className={cn(
          "min-w-0 origin-left truncate max-lg:leading-tight",
          compactProgress > 0 && "max-lg:leading-none",
          ENTITY_PAGE_CHROME_TRANSITION,
        )}
        style={
          compactProgress > 0
            ? {
                fontSize: `calc(1rem + ${1 - compactProgress} * 0.5rem)`,
                lineHeight: 1.25,
              }
            : undefined
        }
      >
        {entityLabel}
      </Heading>

      <div className="flex shrink-0 items-center gap-2">
        {canConfigureView ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDesignLayout}
            className={cn(ENTITY_PAGE_CHROME_TRANSITION, "max-lg:origin-right")}
            style={
              compactProgress > 0
                ? {
                    opacity: 1 - compactProgress,
                    transform: `translateY(${compactProgress * -4}px)`,
                  }
                : undefined
            }
            aria-hidden={compactProgress >= 1 ? true : undefined}
            tabIndex={compactProgress >= 1 ? -1 : undefined}
          >
            {designLayoutLabel}
          </Button>
        ) : null}

        {canCreate ? (
          <div className="relative flex min-h-9 min-w-9 items-center justify-end">
            <Button
              type="button"
              onClick={onCreate}
              className={cn(
                ENTITY_PAGE_CHROME_TRANSITION,
                "max-lg:origin-right",
              )}
              style={
                compactProgress > 0
                  ? {
                      opacity: 1 - compactProgress,
                      transform: `translateY(${compactProgress * -4}px)`,
                    }
                  : undefined
              }
              aria-hidden={compactProgress >= 1 ? true : undefined}
              tabIndex={compactProgress >= 1 ? -1 : undefined}
            >
              {createLabel}
            </Button>
            <IconButton
              label={createLabel}
              size="sm"
              onClick={onCreate}
              className={cn(
                "text-primary hover:text-primary absolute right-0 top-1/2 lg:hidden",
                ENTITY_PAGE_CHROME_TRANSITION,
              )}
              style={{
                opacity: compactProgress,
                transform: `translateY(-50%) scale(${0.82 + compactProgress * 0.18})`,
              }}
              aria-hidden={compactProgress <= 0 ? true : undefined}
              tabIndex={compactProgress <= 0 ? -1 : undefined}
            >
              <CirclePlus className="h-5 w-5" />
            </IconButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
