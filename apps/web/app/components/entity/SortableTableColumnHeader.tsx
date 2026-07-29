import { ArrowDown, ArrowUp } from "lucide-react";
import type { MouseEvent } from "react";

import type { DataViewSortState } from "@repo/data-view";
import { cn } from "@repo/theme/utils";

import { applyTableColumnHeaderSort } from "./apply-table-column-header-sort";

interface SortableTableColumnHeaderProps {
  readonly label: string;
  readonly fieldPath: string;
  readonly sort: DataViewSortState;
  readonly sortAscendingLabel: string;
  readonly sortDescendingLabel: string;
  readonly onSortColumnChange: (columnId: string | null) => void;
  readonly onSortDirectionToggle: () => void;
  readonly className?: string;
}

export function SortableTableColumnHeader({
  label,
  fieldPath,
  sort,
  sortAscendingLabel,
  sortDescendingLabel,
  onSortColumnChange,
  onSortDirectionToggle,
  className,
}: SortableTableColumnHeaderProps) {
  const isActive = sort.columnId === fieldPath;
  const directionLabel =
    sort.direction === "asc" ? sortAscendingLabel : sortDescendingLabel;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    applyTableColumnHeaderSort(
      fieldPath,
      sort,
      onSortColumnChange,
      onSortDirectionToggle,
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex max-w-full cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left font-medium",
        "text-muted-foreground hover:text-foreground hover:underline",
        "focus-visible:underline focus-visible:outline-none",
        className,
      )}
      aria-label={isActive ? `${label}, ${directionLabel}` : label}
      data-testid={`table-column-sort-${fieldPath}`}
    >
      <span className="truncate">{label}</span>
      {isActive ? (
        sort.direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )
      ) : null}
    </button>
  );
}
