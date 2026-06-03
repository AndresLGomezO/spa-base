import {
  resolveColumnWidthPercents,
  type ColumnNode,
} from "@repo/ui-builder-core";
import { useMemo } from "react";
import { Button, Input, Text } from "@repo/ui";

export interface LayoutColumnControlsLabels {
  readonly layoutColumns: string;
  readonly columnTab: (column: number) => string;
  readonly columnWidthPercent: string;
  readonly columnWidthAutoHint: (percent: number) => string;
  readonly moveColumnLeft: string;
  readonly moveColumnRight: string;
  readonly deleteColumn: (column: number) => string;
}

export interface LayoutColumnControlsProps {
  readonly columnCount: number;
  readonly columns: readonly ColumnNode[];
  readonly activeColumn: number;
  readonly labels: LayoutColumnControlsLabels;
  readonly maxColumns?: number;
  readonly onColumnCountChange: (count: number) => void;
  readonly onActiveColumnChange: (index: number) => void;
  readonly onColumnWidthPercentChange: (
    index: number,
    percent: number | undefined,
  ) => void;
  readonly onMoveLeft: () => void;
  readonly onMoveRight: () => void;
  readonly onDelete: () => void;
}

export function LayoutColumnControls({
  columnCount,
  columns,
  activeColumn,
  labels,
  maxColumns = 6,
  onColumnCountChange,
  onActiveColumnChange,
  onColumnWidthPercentChange,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: LayoutColumnControlsProps) {
  const resolvedPercents = useMemo(
    () => resolveColumnWidthPercents(columns),
    [columns],
  );
  const activeColumnNode = columns[activeColumn];
  const resolvedPercent = resolvedPercents[activeColumn];
  const isAuto = activeColumnNode?.widthPercent === undefined;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[8rem] flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{labels.layoutColumns}</span>
          <Input
            type="number"
            min={1}
            max={maxColumns}
            value={columnCount}
            onChange={(event) => {
              const count = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(count)) {
                onColumnCountChange(count);
              }
            }}
          />
        </label>

        <div className="flex flex-wrap gap-1">
          {columns.map((column, index) => (
            <Button
              key={column.id}
              type="button"
              variant={activeColumn === index ? "primary" : "outline"}
              onClick={() => onActiveColumnChange(index)}
            >
              {labels.columnTab(index + 1)}
            </Button>
          ))}
        </div>
      </div>

      {activeColumnNode && columns.length > 1 ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[8rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.columnWidthPercent}
            </span>
            <Input
              type="number"
              min={1}
              max={100}
              placeholder="auto"
              value={activeColumnNode.widthPercent ?? ""}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw === "") {
                  onColumnWidthPercentChange(activeColumn, undefined);
                  return;
                }
                const percent = Number.parseInt(raw, 10);
                if (Number.isFinite(percent)) {
                  onColumnWidthPercentChange(activeColumn, percent);
                }
              }}
            />
          </label>
          {resolvedPercent !== undefined ? (
            <Text variant="muted" className="pb-2 text-sm">
              {isAuto
                ? labels.columnWidthAutoHint(resolvedPercent)
                : `${resolvedPercent}%`}
            </Text>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={activeColumn === 0}
          onClick={onMoveLeft}
        >
          {labels.moveColumnLeft}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={activeColumn >= columns.length - 1}
          onClick={onMoveRight}
        >
          {labels.moveColumnRight}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={columns.length <= 1}
          onClick={onDelete}
        >
          {labels.deleteColumn(activeColumn + 1)}
        </Button>
      </div>
    </>
  );
}
