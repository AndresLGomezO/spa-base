import { Button, Input } from "@repo/ui";

export interface LayoutColumnControlsLabels {
  readonly layoutColumns: string;
  readonly columnTab: (column: number) => string;
  readonly moveColumnLeft: string;
  readonly moveColumnRight: string;
  readonly deleteColumn: (column: number) => string;
}

export interface LayoutColumnControlsProps {
  readonly columnCount: number;
  readonly columns: readonly { readonly id: string }[];
  readonly activeColumn: number;
  readonly labels: LayoutColumnControlsLabels;
  readonly maxColumns?: number;
  readonly onColumnCountChange: (count: number) => void;
  readonly onActiveColumnChange: (index: number) => void;
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
  onMoveLeft,
  onMoveRight,
  onDelete,
}: LayoutColumnControlsProps) {
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
