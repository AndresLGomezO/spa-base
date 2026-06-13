import { ArrowDown, ArrowUp } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@repo/theme/utils";

import { IconButton } from "../icon-button/IconButton";
import { Select } from "../select/Select.js";

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

  const selectedLabel = useMemo(() => {
    if (sort.columnId === null) {
      return sortDefaultLabel;
    }

    return (
      options.find((option) => option.id === sort.columnId)?.label ??
      sortDefaultLabel
    );
  }, [options, sort.columnId, sortDefaultLabel]);

  const measureRef = useRef<HTMLSpanElement>(null);
  const [selectWidth, setSelectWidth] = useState<number | undefined>();

  useLayoutEffect(() => {
    const measureElement = measureRef.current;
    if (!measureElement) {
      return;
    }

    // Padding (px-2 / px-3) plus native select chevron space.
    const paddingAndChrome = 40;
    setSelectWidth(measureElement.offsetWidth + paddingAndChrome);
  }, [selectedLabel]);

  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0",
        "max-md:flex-col max-md:items-start max-md:gap-0.5",
        "md:ml-auto md:flex-row md:items-center md:gap-2",
      )}
      data-testid="data-view-sort-controls"
    >
      <span className="text-sm font-medium leading-none md:whitespace-nowrap">
        {sortByLabel}:
      </span>

      <div className="relative flex min-w-0 items-center gap-1 md:gap-2">
        <span
          ref={measureRef}
          className="pointer-events-none invisible absolute top-0 left-0 whitespace-nowrap text-sm"
          aria-hidden
        >
          {selectedLabel}
        </span>
        <Select
          selectSize="sm"
          value={sort.columnId ?? ""}
          onChange={handleSelectChange}
          disabled={disabled || options.length === 0}
          style={selectWidth == null ? undefined : { width: selectWidth }}
          className={cn(
            "border-input bg-transparent focus:ring-ring max-w-full shrink-0 rounded-xl shadow-none",
            "focus-visible:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
          )}
          aria-label={sortByLabel}
          data-testid="data-view-sort-select"
        >
          <option value="">{sortDefaultLabel}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>

        <IconButton
          type="button"
          label={directionLabel}
          onClick={onDirectionToggle}
          disabled={disabled || sort.columnId === null}
          className="h-8 w-8 shrink-0 rounded-xl md:h-9 md:w-9"
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
