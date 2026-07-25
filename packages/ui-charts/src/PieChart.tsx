import { useMemo } from "react";
import { Group } from "@visx/group";
import { Pie } from "@visx/shape";
import { cn } from "@repo/theme/utils";

import { ChartContainer } from "./ChartContainer.js";
import { resolveChartGlowStrokeColor } from "./chart-glow-filter.js";

export interface PieChartSlice {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export interface PieChartProps {
  readonly title?: string;
  readonly slices: readonly PieChartSlice[];
  readonly innerRadiusRatio?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly emptyMessage?: string;
}

export interface NormalizedPieSlice {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly color: string;
}

/**
 * Drop non-positive / non-finite slices, then normalize remaining values to
 * percentages that sum to 100. Returns empty when nothing usable remains.
 */
export function normalizePieSlices(
  slices: readonly PieChartSlice[],
): readonly NormalizedPieSlice[] {
  const usable = slices
    .map((slice, index) => {
      const value = slice.value;
      if (!Number.isFinite(value) || value <= 0) {
        return null;
      }
      const label = slice.label.trim();
      if (!label) {
        return null;
      }
      return {
        id: slice.id.trim() || `slice-${index}`,
        label,
        value,
        color:
          slice.color?.trim() ||
          resolveChartGlowStrokeColor(index, "var(--color-primary, #6366f1)"),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (usable.length === 0) {
    return [];
  }

  const total = usable.reduce((sum, entry) => sum + entry.value, 0);
  if (!(total > 0)) {
    return [];
  }

  return usable.map((entry) => ({
    ...entry,
    percent: (entry.value / total) * 100,
  }));
}

export function PieChart({
  title,
  slices,
  innerRadiusRatio = 0.62,
  className,
  ariaLabel,
  emptyMessage = "No data",
}: PieChartProps) {
  const normalized = useMemo(() => normalizePieSlices(slices), [slices]);
  const resolvedTitle = title?.trim() || undefined;
  const accessible =
    ariaLabel?.trim() ||
    [
      resolvedTitle,
      ...normalized.map(
        (slice) => `${slice.label} ${Math.round(slice.percent)}%`,
      ),
    ]
      .filter(Boolean)
      .join(", ");

  if (normalized.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)}>
      {resolvedTitle ? (
        <p className="text-foreground text-center text-xs font-medium">
          {resolvedTitle}
        </p>
      ) : null}
      <div className="mx-auto flex w-fit flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
        <ChartContainer
          className="h-28 w-28 shrink-0"
          ariaLabel={accessible || emptyMessage}
        >
          {({ width, height }) => {
            const size = Math.min(width, height);
            const radius = size / 2;
            const innerRadius =
              radius * Math.max(0, Math.min(0.95, innerRadiusRatio));
            const centerX = width / 2;
            const centerY = height / 2;

            return (
              <svg width={width} height={height} aria-hidden>
                <Group top={centerY} left={centerX}>
                  <Pie
                    data={[...normalized]}
                    pieValue={(slice) => slice.value}
                    outerRadius={radius}
                    innerRadius={innerRadius}
                    padAngle={0.02}
                    cornerRadius={2}
                  >
                    {(pie) =>
                      pie.arcs.map((arc) => (
                        <g key={arc.data.id}>
                          <path
                            d={pie.path(arc) ?? undefined}
                            fill={arc.data.color}
                            stroke="var(--color-card, #fff)"
                            strokeWidth={1}
                          />
                        </g>
                      ))
                    }
                  </Pie>
                </Group>
              </svg>
            );
          }}
        </ChartContainer>
        <ul className="flex flex-col items-start gap-1.5">
          {normalized.map((slice) => (
            <li
              key={slice.id}
              className="text-muted-foreground inline-flex items-center gap-2 text-xs"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="inline-flex items-baseline gap-1">
                <span>{slice.label}</span>
                <span className="tabular-nums">
                  {Math.round(slice.percent)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
