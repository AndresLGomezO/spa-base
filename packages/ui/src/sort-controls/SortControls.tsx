import { ArrowDown, ArrowUp } from "lucide-react";
import { useCallback } from "react";

import { cn } from "@repo/theme/utils";

import { IconButton } from "../icon-button/IconButton";

export interface SortControlsOption {
  readonly id: string;
  readonly label: string;
}

export type SortControlsDirection = "asc" | "desc";

export interface SortControlsSortState {
  readonly columnId: string | null;
  readonly direction: SortControlsDirection;
}

export interface SortControlsProps {
  readonly options: readonly SortControlsOption[];
  readonly sort: SortControlsSortState;
  readonly sortByLabel: string;
  readonly sortDefaultLabel: string;
  readonly sortAscendingLabel: string;
  readonly sortDescendingLabel: string;
  readonly onColumnChange: (columnId: string | null) => void;
  readonly onDirectionToggle: () => void;
  readonly disabled?: boolean;
}

export function SortControls({
  options,
  sort,
  sortByLabel,
  sortDefaultLabel,
  sortAscendingLabel,
  sortDescendingLabel,
  onColumnChange,
  onDirectionToggle,
  disabled = false,
}: SortControlsProps) {
  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onColumnChange(value === "" ? null : value);
    },
    [onColumnChange],
  );

  const directionLabel =
    sort.direction === "asc" ? sortAscendingLabel : sortDescendingLabel;

  return (
    <div
      className={cn(
        "ml-auto flex min-w-0 shrink-0",
        "max-md:flex-col max-md:items-start max-md:gap-0.5",
        "md:flex-row md:items-center md:gap-2",
      )}
      data-testid="data-view-sort-controls"
    >
      <span className="text-sm font-medium leading-none md:whitespace-nowrap">
        {sortByLabel}:
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <select
          value={sort.columnId ?? ""}
          onChange={handleSelectChange}
          disabled={disabled || options.length === 0}
          className="border-input bg-transparent focus:ring-ring h-9 min-w-[140px] rounded-xl border px-3 py-1.5 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
          aria-label={sortByLabel}
          data-testid="data-view-sort-select"
        >
          <option value="">{sortDefaultLabel}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <IconButton
          type="button"
          label={directionLabel}
          onClick={onDirectionToggle}
          disabled={disabled || sort.columnId === null}
          className="h-9 w-9 shrink-0 rounded-xl"
          data-testid="data-view-sort-direction"
        >
          {sort.direction === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </IconButton>
      </div>
    </div>
  );
}
