import { useMemo } from "react";
import { Group } from "@visx/group";
import { Pie } from "@visx/shape";
import { cn } from "@repo/theme/utils";

import { ChartContainer } from "./ChartContainer.js";
import type { DonutChartProps } from "./types.js";

export interface DonutSlice {
  readonly id: string;
  readonly value: number;
  readonly color: string;
}

export function buildDonutSlices(
  value: number,
  maxValue: number,
  fillColor: string,
  trackColor: string,
): readonly DonutSlice[] {
  const safeMax = maxValue > 0 ? maxValue : 100;
  const clampedValue = Math.max(0, Math.min(value, safeMax));
  const remainder = Math.max(0, safeMax - clampedValue);

  return [
    { id: "value", value: clampedValue, color: fillColor },
    { id: "remainder", value: remainder, color: trackColor },
  ];
}

export function DonutChart({
  value,
  maxValue = 100,
  fillColor = "var(--color-primary, #6366f1)",
  trackColor = "color-mix(in oklch, var(--color-primary, #6366f1) 20%, transparent)",
  innerRadiusRatio = 0.72,
  centerLabel,
  showCenterLabel = true,
  strokeWidth = 0,
  ariaLabel,
  className,
  loading = false,
  emptyMessage = "No data",
}: DonutChartProps) {
  const slices = useMemo(
    () => buildDonutSlices(value, maxValue, fillColor, trackColor),
    [fillColor, maxValue, trackColor, value],
  );

  const hasValue = Number.isFinite(value);
  const displayLabel =
    showCenterLabel && centerLabel?.trim() ? centerLabel.trim() : null;

  return (
    <ChartContainer className={className} ariaLabel={ariaLabel}>
      {({ width, height }) => {
        const size = Math.min(width, height);
        const radius = size / 2;
        const innerRadius = radius * innerRadiusRatio;
        const centerX = width / 2;
        const centerY = height / 2;

        if (loading) {
          return (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
              Loading…
            </div>
          );
        }

        if (!hasValue) {
          return (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
              {emptyMessage}
            </div>
          );
        }

        return (
          <div className="relative h-full w-full">
            <svg width={width} height={height} aria-hidden>
              <Group top={centerY} left={centerX}>
                <Pie
                  data={[...slices]}
                  pieValue={(slice) => slice.value}
                  outerRadius={radius}
                  innerRadius={innerRadius}
                  padAngle={0}
                  cornerRadius={strokeWidth > 0 ? 2 : 0}
                >
                  {(pie) =>
                    pie.arcs.map((arc) => (
                      <g key={arc.data.id}>
                        <path
                          d={
                            pie.path(arc) ??
                            undefined
                          }
                          fill={arc.data.color}
                          stroke={strokeWidth > 0 ? "var(--color-card)" : "none"}
                          strokeWidth={strokeWidth}
                        />
                      </g>
                    ))
                  }
                </Pie>
              </Group>
            </svg>
            {displayLabel ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center justify-center",
                )}
              >
                <span className="text-center text-sm font-bold leading-none">
                  {displayLabel}
                </span>
              </div>
            ) : null}
          </div>
        );
      }}
    </ChartContainer>
  );
}
