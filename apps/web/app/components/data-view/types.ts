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
