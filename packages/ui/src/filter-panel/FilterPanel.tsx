import type { ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";

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
        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
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

  const toolbarRow = (
    <div className="flex w-full min-w-0 items-center gap-2">
      {triggerButton}
      {toolbarPrefix}
      <div className="ml-auto shrink-0">{sibling}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {badgesBelowToolbar ? (
        <>
          {toolbarRow}
          {badgesContent ? (
            <div className="flex flex-wrap items-center gap-2">
              {badgesContent}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center gap-2">
              {triggerButton}
              {toolbarPrefix}
              <div className="ml-auto shrink-0">{sibling}</div>
            </div>
            {badgesContent ? (
              <div className="flex flex-wrap items-center gap-2">
                {badgesContent}
              </div>
            ) : null}
          </div>
          <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
            {triggerButton}
            {toolbarPrefix}
            {badgesContent}
            <div className="ml-auto shrink-0">{sibling}</div>
          </div>
        </>
      )}

      {open ? (
        <div className="animate-in fade-in slide-in-from-top-2 space-y-4 px-2 pt-4 duration-200">
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
      ) : null}
    </div>
  );
}
