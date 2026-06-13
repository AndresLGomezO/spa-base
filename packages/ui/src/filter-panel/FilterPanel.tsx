import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";

import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button";
import { FilterValueBadge } from "../filter-value-badge/FilterValueBadge";

export interface FilterBadge {
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
}

interface FilterPanelToolbarProps {
  readonly triggerButton: ReactNode;
  readonly toolbarPrefix?: ReactNode;
  readonly sibling?: ReactNode;
  readonly badgesContent: ReactNode;
  readonly inlineBadges: boolean;
}

interface FilterPanelBodyProps {
  readonly open: boolean;
  readonly children: ReactNode;
  readonly onClearAll?: () => void;
  readonly clearAllLabel: string;
  readonly disabled: boolean;
}

function FilterPanelBody({
  open,
  children,
  onClearAll,
  clearAllLabel,
  disabled,
}: FilterPanelBodyProps) {
  return (
    <div
      data-expanded={open ? "true" : "false"}
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
      aria-hidden={!open}
    >
      <div className={cn("overflow-hidden", open && "overflow-visible")}>
        <div
          className={cn(
            "space-y-4 px-2 pt-4 transition-opacity duration-300 ease-out motion-reduce:transition-none",
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
}: FilterPanelToolbarProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex w-full min-w-0 items-end gap-2 md:items-center">
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
        <div className="flex flex-wrap items-center gap-2">{badgesContent}</div>
      ) : null}
    </div>
  );
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
}: FilterPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function isInsidePanel(target: Node | null | undefined): boolean {
      return target != null && rootRef.current?.contains(target) === true;
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
  }, [close, open]);

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      className="flex shrink-0 items-center gap-2 rounded-xl"
      disabled={disabled}
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      data-testid="filter-panel-trigger"
    >
      <Filter className="h-4 w-4" />
      {triggerLabel}
      <ChevronDown
        className={cn(
          "h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
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

  return (
    <div
      ref={rootRef}
      className={cn("flex flex-col gap-2", open && "relative z-30 isolate")}
    >
      <FilterPanelToolbar
        triggerButton={triggerButton}
        toolbarPrefix={toolbarPrefix}
        sibling={sibling}
        badgesContent={badgesContent}
        inlineBadges={!badgesBelowToolbar}
      />

      <FilterPanelBody
        open={open}
        onClearAll={onClearAll}
        clearAllLabel={clearAllLabel}
        disabled={disabled}
      >
        {children}
      </FilterPanelBody>
    </div>
  );
}
