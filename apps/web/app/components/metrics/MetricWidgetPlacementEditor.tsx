import { Input, Text } from "@repo/ui";
import type { MetricWidgetPlacement, ViewMetricWidget } from "@repo/entities";
import { findPlacementConflicts } from "@repo/entities";
import { useTranslation } from "react-i18next";

const SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

interface MetricWidgetPlacementEditorProps {
  readonly widget: ViewMetricWidget;
  readonly widgets: readonly ViewMetricWidget[];
  readonly columnCount: number;
  readonly placement: MetricWidgetPlacement;
  readonly onChange: (placement: MetricWidgetPlacement) => void;
}

export function MetricWidgetPlacementEditor({
  widget,
  widgets,
  columnCount,
  placement,
  onChange,
}: MetricWidgetPlacementEditorProps) {
  const { t } = useTranslation("common");
  const conflicts = findPlacementConflicts(
    widgets,
    columnCount,
    widget.id,
    placement,
  );
  const maxColumnSpan = columnCount - placement.column + 1;

  return (
    <div className="flex flex-col gap-3">
      <Text className="text-sm font-medium">
        {t("designLayout.metricsWidgetPlacement")}
      </Text>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("designLayout.metricsPlacementColumn")}
          </span>
          <select
            className={SELECT_CLASS}
            value={placement.column}
            onChange={(event) =>
              onChange({
                ...placement,
                column: Number.parseInt(event.target.value, 10),
              })
            }
          >
            {Array.from({ length: columnCount }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("designLayout.metricsPlacementRow")}
          </span>
          <Input
            type="number"
            min={1}
            value={placement.row ?? 1}
            onChange={(event) => {
              const row = Number.parseInt(event.target.value, 10);
              onChange({
                ...placement,
                row: Number.isFinite(row) && row >= 1 ? row : 1,
              });
            }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("designLayout.metricsPlacementColumnSpan")}
          </span>
          <Input
            type="number"
            min={1}
            max={maxColumnSpan}
            value={placement.columnSpan ?? 1}
            onChange={(event) => {
              const columnSpan = Number.parseInt(event.target.value, 10);
              onChange({
                ...placement,
                columnSpan:
                  Number.isFinite(columnSpan) && columnSpan >= 1
                    ? Math.min(columnSpan, maxColumnSpan)
                    : 1,
              });
            }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("designLayout.metricsPlacementRowSpan")}
          </span>
          <Input
            type="number"
            min={1}
            value={placement.rowSpan ?? 1}
            onChange={(event) => {
              const rowSpan = Number.parseInt(event.target.value, 10);
              onChange({
                ...placement,
                rowSpan: Number.isFinite(rowSpan) && rowSpan >= 1 ? rowSpan : 1,
              });
            }}
          />
        </label>
      </div>

      {widget.display === "series" ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("entity.viewSettings.stackDirection")}
          </span>
          <select
            className={SELECT_CLASS}
            value={placement.stackDirection ?? "column"}
            onChange={(event) =>
              onChange({
                ...placement,
                stackDirection: event.target.value as "column" | "row",
              })
            }
          >
            <option value="column">
              {t("entity.viewSettings.stackVertical")}
            </option>
            <option value="row">
              {t("entity.viewSettings.stackHorizontal")}
            </option>
          </select>
        </label>
      ) : null}

      {conflicts.length > 0 ? (
        <Text variant="muted" className="text-xs">
          {t("designLayout.metricsPlacementConflict", {
            ids: conflicts.join(", "),
          })}
        </Text>
      ) : null}
    </div>
  );
}
