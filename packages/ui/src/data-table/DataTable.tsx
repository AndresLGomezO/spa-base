import type { ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { Pagination, type PaginationLabels } from "../pagination/Pagination";
import { Skeleton } from "../skeleton/Skeleton";
import { Text } from "../typography/Text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table/Table";
import { TableCard } from "../table/TableCard";

export interface DataTableColumn<T> {
  readonly id: string;
  readonly header: ReactNode;
  readonly cell: (row: T) => ReactNode;
  readonly headerClassName?: string;
  readonly cellClassName?: string;
}

export interface DataTableProps<T> {
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly getRowId: (row: T) => string;
  readonly page: number;
  readonly totalCount: number;
  readonly onPageChange: (page: number) => void;
  readonly pageSize?: number;
  readonly isLoading?: boolean;
  readonly emptyMessage?: ReactNode;
  readonly loadingMessage?: ReactNode;
  readonly actionsColumn?: DataTableColumn<T>;
  readonly className?: string;
  readonly scrollClassName?: string;
  readonly paginationLabels?: PaginationLabels;
  readonly "aria-label"?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  page,
  totalCount,
  onPageChange,
  pageSize = 10,
  isLoading = false,
  emptyMessage = "No results.",
  loadingMessage = "Loading…",
  actionsColumn,
  className,
  scrollClassName,
  paginationLabels,
  "aria-label": ariaLabel,
}: DataTableProps<T>) {
  const columnCount = columns.length + (actionsColumn ? 1 : 0);

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <TableCard aria-label={ariaLabel} className="w-full overflow-hidden">
        <div
          className={cn(
            "max-h-[calc(100dvh-14rem)] overflow-y-auto overflow-x-hidden",
            scrollClassName,
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id} className={column.headerClassName}>
                    {column.header}
                  </TableHead>
                ))}
                {actionsColumn ? (
                  <TableHead
                    className={cn("text-center", actionsColumn.headerClassName)}
                  >
                    {actionsColumn.header}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-32 text-center">
                    <Text className="text-muted-foreground">
                      {loadingMessage}
                    </Text>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-32 text-center">
                    <Text className="text-muted-foreground">
                      {emptyMessage}
                    </Text>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={getRowId(row)}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={column.cellClassName}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                    {actionsColumn ? (
                      <TableCell
                        className={cn(
                          "text-center",
                          actionsColumn.cellClassName,
                        )}
                      >
                        {actionsColumn.cell(row)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {isLoading && rows.length > 0 ? (
          <div className="border-border border-t px-4 py-2">
            <Skeleton className="h-4 w-32" />
          </div>
        ) : null}
      </TableCard>

      <Pagination
        className="shrink-0"
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
        labels={paginationLabels}
      />
    </div>
  );
}
