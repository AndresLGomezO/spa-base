import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";

import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button";
import { FilterValueBadge } from "../filter-value-badge/FilterValueBadge";

interface FilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

export interface FilterPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly activeBadges: readonly FilterBadge[];
  readonly children: ReactNode;
  readonly triggerLabel: string;
  readonly clearAllLabel: string;
  readonly removeAriaLabel: (badgeLabel: string) => string;
  readonly onClearAll?: () => void;
  readonly disabled?: boolean;
  readonly toolbarPrefix?: ReactNode;
  readonly sibling?: ReactNode;
  readonly badgesBelowToolbar?: boolean;
  /** When false, only the toolbar is rendered (body rendered separately). */
  readonly renderBody?: boolean;
  /** Compact toolbar that hugs content width. */
  readonly compact?: boolean;
  /** When true with compact, toolbar spans full width (search can flex). */
  readonly toolbarFillWidth?: boolean;
  /** When false, click-outside dismiss is handled by a parent container. */
  readonly manageDismiss?: boolean;
}

interface FilterPanelToolbarProps {
  readonly triggerButton: ReactNode;
  readonly toolbarPrefix?: ReactNode;
  readonly sibling?: ReactNode;
  readonly badgesContent: ReactNode;
  readonly inlineBadges: boolean;
  readonly compact?: boolean;
  readonly toolbarFillWidth?: boolean;
}

export interface FilterPanelBodyProps {
  readonly open: boolean;
  readonly children: ReactNode;
  readonly onClearAll?: () => void;
  readonly clearAllLabel: string;
  readonly disabled: boolean;
}

export function FilterPanelBody({
  open,
  children,
  onClearAll,
  clearAllLabel,
  disabled,
}: FilterPanelBodyProps) {
  const transitionClassName =
    "duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

  return (
    <div
      data-expanded={open ? "true" : "false"}
      className={cn(
        "grid transition-[grid-template-rows]",
        transitionClassName,
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "space-y-4 px-2 pt-4 transition-opacity",
            transitionClassName,
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          inert={open ? undefined : true}
        >
          {children}
          {onClearAll ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit rounded-xl"
              onClick={onClearAll}
              disabled={disabled}
              data-testid="filter-panel-clear-all"
            >
              {clearAllLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterPanelToolbar({
  triggerButton,
  toolbarPrefix,
  sibling,
  badgesContent,
  inlineBadges,
  compact = false,
  toolbarFillWidth = false,
}: FilterPanelToolbarProps) {
  const fillWidth = compact && toolbarFillWidth;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        fillWidth || !compact ? "w-full min-w-0" : "w-fit max-w-full shrink-0",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-nowrap items-end gap-1.5 md:gap-2",
          !compact && "md:items-center",
          fillWidth || !compact ? "w-full min-w-0" : "w-fit max-w-full",
        )}
      >
        {triggerButton}
        {toolbarPrefix}
        {inlineBadges && badgesContent ? (
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {badgesContent}
          </div>
        ) : null}
        {sibling ? (
          <div className="ml-auto min-w-0 shrink-0">{sibling}</div>
        ) : null}
      </div>

      {inlineBadges && badgesContent ? (
        <div className="flex flex-wrap items-center gap-2 md:hidden">
          {badgesContent}
        </div>
      ) : null}

      {!inlineBadges && badgesContent ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            fillWidth && "w-full min-w-0",
          )}
        >
          {badgesContent}
        </div>
      ) : null}
    </div>
  );
}

export function useFilterPanelDismiss(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  rootRef: React.RefObject<HTMLElement | null>,
  enabled = true,
) {
  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!enabled || !open) {
      return;
    }

    function isInsidePanel(target: Node | null | undefined): boolean {
      if (target == null) {
        return false;
      }

      if (rootRef.current?.contains(target) === true) {
        return true;
      }

      return (
        target instanceof Element &&
        target.closest("[data-popover-panel]") != null
      );
    }

    function handlePointerDown(event: PointerEvent) {
      if (isInsidePanel(event.target as Node)) {
        return;
      }
      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, enabled, open, rootRef]);
}

export function FilterPanel({
  open,
  onOpenChange,
  activeBadges,
  children,
  triggerLabel,
  clearAllLabel,
  removeAriaLabel,
  onClearAll,
  disabled = false,
  toolbarPrefix,
  sibling,
  badgesBelowToolbar = false,
  renderBody = true,
  compact = false,
  toolbarFillWidth = false,
  manageDismiss = true,
}: FilterPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useFilterPanelDismiss(open, onOpenChange, rootRef, manageDismiss);

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="flex shrink-0 items-center gap-1 rounded-xl max-md:px-2.5 md:gap-2"
      disabled={disabled}
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      data-testid="filter-panel-trigger"
    >
      <Filter className="h-4 w-4" />
      {triggerLabel}
      <ChevronDown
        className={cn(
          "h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          open && "rotate-180",
        )}
      />
    </Button>
  );

  const showBadges = badgesBelowToolbar
    ? activeBadges.length > 0
    : !open && activeBadges.length > 0;

  const badgesContent = showBadges
    ? activeBadges.map(({ id, label, onRemove }) => (
        <FilterValueBadge
          key={id}
          label={label}
          onRemove={onRemove}
          removeAriaLabel={removeAriaLabel(label)}
        />
      ))
    : null;

  const toolbar = (
    <FilterPanelToolbar
      triggerButton={triggerButton}
      toolbarPrefix={toolbarPrefix}
      sibling={sibling}
      badgesContent={badgesContent}
      inlineBadges={!badgesBelowToolbar}
      compact={compact}
      toolbarFillWidth={toolbarFillWidth}
    />
  );

  const body = (
    <FilterPanelBody
      open={open}
      onClearAll={onClearAll}
      clearAllLabel={clearAllLabel}
      disabled={disabled}
    >
      {children}
    </FilterPanelBody>
  );

  if (!renderBody) {
    return (
      <div
        ref={rootRef}
        className={cn(
          compact && toolbarFillWidth && "w-full min-w-0",
          open && "relative z-30 isolate",
        )}
      >
        {toolbar}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("flex flex-col gap-2", open && "relative z-30 isolate")}
    >
      {toolbar}
      {body}
    </div>
  );
}
