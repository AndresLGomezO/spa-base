import { ArrowDown, ArrowUp } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { IconButton } from "@repo/ui";

import type { DataViewColumnDescriptor, DataViewSortState } from "./types";

interface SortControlsProps<T> {
  readonly columns: readonly DataViewColumnDescriptor<T>[];
  readonly sort: DataViewSortState;
  readonly onColumnChange: (columnId: string | null) => void;
  readonly onDirectionToggle: () => void;
  readonly disabled?: boolean;
}

export function SortControls<T>({
  columns,
  sort,
  onColumnChange,
  onDirectionToggle,
  disabled = false,
}: SortControlsProps<T>) {
  const { t } = useTranslation("common");

  const sortableColumns = columns.filter((column) => column.sortable !== false);

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onColumnChange(value === "" ? null : value);
    },
    [onColumnChange],
  );

  const directionLabel =
    sort.direction === "asc"
      ? t("dataView.sortAscending")
      : t("dataView.sortDescending");

  return (
    <div
      className="ml-auto flex shrink-0 flex-wrap items-center gap-2"
      data-testid="data-view-sort-controls"
    >
      <span className="text-sm font-medium whitespace-nowrap">
        {t("dataView.sortBy")}:
      </span>

      <select
        value={sort.columnId ?? ""}
        onChange={handleSelectChange}
        disabled={disabled || sortableColumns.length === 0}
        className="border-input bg-transparent focus:ring-ring h-9 min-w-[140px] rounded-xl border px-3 py-1.5 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
        aria-label={t("dataView.sortBy")}
        data-testid="data-view-sort-select"
      >
        <option value="">{t("dataView.sortDefault")}</option>
        {sortableColumns.map((column) => (
          <option key={column.id} value={column.id}>
            {column.label}
          </option>
        ))}
      </select>

      <IconButton
        type="button"
        label={directionLabel}
        onClick={onDirectionToggle}
        disabled={disabled || sort.columnId === null}
        className="h-9 w-9 rounded-xl"
        data-testid="data-view-sort-direction"
      >
        {sort.direction === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </IconButton>
    </div>
  );
}
