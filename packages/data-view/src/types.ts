export type DataViewFilterKind = "multi-select" | "boolean";

export type DataViewSortDirection = "asc" | "desc";

export interface DataViewSortState {
  readonly columnId: string | null;
  readonly direction: DataViewSortDirection;
}

export interface DataViewColumnDescriptor<T> {
  readonly id: string;
  readonly label: string;
  readonly getValue: (item: T) => unknown;
  readonly getDisplayValue?: (item: T) => string;
  readonly getFilterValue?: (value: unknown) => string;
  readonly formatValue?: (value: unknown) => string;
  readonly filterable?: boolean;
  readonly sortable?: boolean;
  readonly searchable?: boolean;
  readonly filterKind?: DataViewFilterKind;
  readonly getRowId?: (item: T) => string;
}

export interface DataViewFilterBadge {
  readonly id: string;
  readonly label: string;
  readonly onRemove: () => void;
}

export interface DataViewFilterOption {
  readonly value: string;
  readonly label: string;
}

export interface DataViewToolbarLabels {
  readonly searchPlaceholder: string;
  readonly searchClear: string;
  readonly filtersTrigger: string;
  readonly filtersClearAll: string;
  readonly removeBadge: (label: string) => string;
  readonly filterPlaceholder: string;
  readonly filterSearchPlaceholder: string;
  readonly filterSelectedCount: (count: number) => string;
  readonly noFilterResults: string;
  readonly sortBy: string;
  readonly sortDefault: string;
  readonly sortAscending: string;
  readonly sortDescending: string;
}
