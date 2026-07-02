import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { DebuggerTimelineBucket } from "../../compute-debugger-source-stats";
import { DEBUGGER_TIMELINE_LINE_CLASS } from "../../debugger-summary-motion";

const VIEWBOX_SIZES = {
  default: {
    width: 320,
    height: 136,
    margin: { top: 10, right: 10, bottom: 30, left: 34 },
    fontSize: 9,
    strokeWidth: 2,
    totalDotRadius: 2.5,
    errorDotRadius: 2,
  },
  large: {
    width: 720,
    height: 320,
    margin: { top: 16, right: 16, bottom: 44, left: 44 },
    fontSize: 12,
    strokeWidth: 2.5,
    totalDotRadius: 4,
    errorDotRadius: 3.5,
  },
} as const;

function buildLinePath(
  points: ReadonlyArray<{ readonly x: number; readonly y: number }>,
): string {
  if (points.length === 0) {
    return "";
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function pickAxisIndices(bucketCount: number): number[] {
  if (bucketCount <= 1) {
    return [0];
  }
  if (bucketCount <= 5) {
    return Array.from({ length: bucketCount }, (_, index) => index);
  }
  const quarter = Math.floor((bucketCount - 1) / 4);
  const middle = Math.floor((bucketCount - 1) / 2);
  const threeQuarter = Math.floor(((bucketCount - 1) * 3) / 4);
  return [0, quarter, middle, threeQuarter, bucketCount - 1].filter(
    (value, index, values) => values.indexOf(value) === index,
  );
}

export function DebuggerTimelineChart({
  buckets,
  ariaLabel,
  showErrors = true,
  size = "default",
}: {
  readonly buckets: readonly DebuggerTimelineBucket[];
  readonly ariaLabel: string;
  readonly showErrors?: boolean;
  readonly size?: keyof typeof VIEWBOX_SIZES;
}) {
  const { t } = useTranslation("common");
  const viewbox = VIEWBOX_SIZES[size];
  const { margin } = viewbox;

  const chart = useMemo(() => {
    const hasData = buckets.some((bucket) => bucket.total > 0);
    if (!hasData) {
      return null;
    }

    const innerWidth = viewbox.width - margin.left - margin.right;
    const innerHeight = viewbox.height - margin.top - margin.bottom;
    const maxValue = Math.max(
      1,
      ...buckets.map((bucket) =>
        showErrors ? Math.max(bucket.total, bucket.errors) : bucket.total,
      ),
    );
    const xStep = buckets.length > 1 ? innerWidth / (buckets.length - 1) : 0;

    const xAt = (index: number) => margin.left + index * xStep;
    const yAt = (value: number) =>
      margin.top + innerHeight - (value / maxValue) * innerHeight;

    const totalPoints = buckets.map((bucket, index) => ({
      x: xAt(index),
      y: yAt(bucket.total),
    }));
    const errorPoints = buckets.map((bucket, index) => ({
      x: xAt(index),
      y: yAt(bucket.errors),
    }));

    const yTicks = [0, Math.ceil(maxValue / 2), maxValue].filter(
      (value, index, values) => values.indexOf(value) === index,
    );
    const xTickIndices = pickAxisIndices(buckets.length);

    return {
      totalPath: buildLinePath(totalPoints),
      errorPath: showErrors ? buildLinePath(errorPoints) : "",
      totalPoints,
      errorPoints: showErrors ? errorPoints : [],
      yTicks,
      xTickIndices,
      innerHeight,
      maxValue,
    };
  }, [
    buckets,
    margin.bottom,
    margin.left,
    margin.right,
    margin.top,
    showErrors,
    viewbox.height,
    viewbox.width,
  ]);

  if (!chart) {
    return null;
  }

  const baselineY = margin.top + chart.innerHeight;
  const axisFontClass =
    size === "large"
      ? "fill-muted-foreground text-xs"
      : "fill-muted-foreground text-[9px]";

  return (
    <div className={cn("space-y-2", size === "large" && "space-y-4")}>
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${viewbox.width} ${viewbox.height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {chart.yTicks.map((tick) => {
          const y =
            margin.top +
            chart.innerHeight -
            (tick / chart.maxValue) * chart.innerHeight;
          return (
            <g key={`y-${tick}`}>
              <line
                x1={margin.left}
                y1={y}
                x2={viewbox.width - margin.right}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={margin.left - 8}
                y={y + 4}
                textAnchor="end"
                className={axisFontClass}
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          y1={baselineY}
          x2={viewbox.width - margin.right}
          y2={baselineY}
          className="stroke-border"
          strokeWidth={1}
        />
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={baselineY}
          className="stroke-border"
          strokeWidth={1}
        />

        {chart.xTickIndices.map((index) => {
          const bucket = buckets[index];
          if (!bucket) {
            return null;
          }
          const x =
            margin.left +
            (buckets.length > 1
              ? (index / (buckets.length - 1)) *
                (viewbox.width - margin.left - margin.right)
              : 0);
          return (
            <text
              key={`x-${index}`}
              x={x}
              y={viewbox.height - (size === "large" ? 12 : 8)}
              textAnchor={
                index === 0
                  ? "start"
                  : index === buckets.length - 1
                    ? "end"
                    : "middle"
              }
              className={axisFontClass}
            >
              {bucket.label}
            </text>
          );
        })}

        {chart.totalPath ? (
          <path
            d={chart.totalPath}
            fill="none"
            stroke="var(--color-chart-1)"
            strokeWidth={viewbox.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={DEBUGGER_TIMELINE_LINE_CLASS}
          />
        ) : null}

        {chart.errorPath ? (
          <path
            d={chart.errorPath}
            fill="none"
            stroke="var(--color-destructive)"
            strokeWidth={viewbox.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3"
            className={DEBUGGER_TIMELINE_LINE_CLASS}
          />
        ) : null}

        {chart.totalPoints.map((point, index) => (
          <circle
            key={`total-${index}`}
            cx={point.x}
            cy={point.y}
            r={viewbox.totalDotRadius}
            fill="var(--color-chart-1)"
          />
        ))}

        {chart.errorPoints.map((point, index) => (
          <circle
            key={`error-${index}`}
            cx={point.x}
            cy={point.y}
            r={viewbox.errorDotRadius}
            fill="var(--color-destructive)"
          />
        ))}
      </svg>

      <div
        className={cn(
          "text-muted-foreground flex flex-wrap gap-4",
          size === "large" ? "text-sm" : "text-xs",
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ backgroundColor: "var(--color-chart-1)" }}
            aria-hidden
          />
          <Text>{t("debugger.summary.timelineEvents")}</Text>
        </span>
        {showErrors ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 rounded-full border border-dashed border-destructive bg-transparent"
              aria-hidden
            />
            <Text>{t("debugger.summary.errors")}</Text>
          </span>
        ) : null}
      </div>
    </div>
  );
}
