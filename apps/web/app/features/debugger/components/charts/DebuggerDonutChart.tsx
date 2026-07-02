import type { ReactNode } from "react";

import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { DEBUGGER_DONUT_SEGMENT_CLASS } from "../../debugger-summary-motion";

export interface DebuggerDonutSegment {
  readonly label: string;
  readonly value: number;
  readonly className?: string;
  readonly colorVar?: string;
}

const DONUT_SIZE = {
  default: { radius: 42, strokeWidth: 14 },
  large: { radius: 64, strokeWidth: 16 },
} as const;

const EXPANDED_DONUT = { radius: 120, strokeWidth: 22 };

function formatSegmentPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

export function DebuggerDonutChart({
  segments,
  center,
  ariaLabel,
  size = "default",
  layout = "compact",
}: {
  readonly segments: readonly DebuggerDonutSegment[];
  readonly center?: ReactNode;
  readonly ariaLabel: string;
  readonly size?: keyof typeof DONUT_SIZE;
  readonly layout?: "compact" | "expanded";
}) {
  const { radius, strokeWidth } =
    layout === "expanded" ? EXPANDED_DONUT : DONUT_SIZE[size];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  let offset = 0;
  const svgSize = radius * 2;
  const isExpanded = layout === "expanded";

  const ring = (
    <div
      className={cn(
        "relative shrink-0",
        isExpanded
          ? "aspect-square w-full max-h-[min(45vh,22rem)] max-w-[min(45vh,22rem)] sm:max-h-[min(50vh,26rem)] sm:max-w-[min(50vh,26rem)]"
          : undefined,
      )}
      style={isExpanded ? undefined : { width: svgSize, height: svgSize }}
    >
      <svg
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        width={isExpanded ? undefined : svgSize}
        height={isExpanded ? undefined : svgSize}
        role="img"
        aria-label={ariaLabel}
        className={cn("-rotate-90", isExpanded && "size-full")}
      >
        {total === 0 ? (
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/40"
          />
        ) : (
          segments.map((segment) => {
            if (segment.value <= 0) {
              return null;
            }

            const length = (segment.value / total) * circumference;
            const dashArray = `${length} ${circumference - length}`;
            const dashOffset = -offset;
            offset += length;

            const stroke =
              segment.colorVar != null ? `var(${segment.colorVar})` : undefined;

            return (
              <circle
                key={segment.label}
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className={`${segment.className ?? ""} ${DEBUGGER_DONUT_SEGMENT_CLASS}`}
              />
            );
          })
        )}
      </svg>
      {center ? (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          {center}
        </div>
      ) : null}
    </div>
  );

  const legend = (
    <ul
      className={cn(
        "min-w-0 space-y-1.5",
        isExpanded
          ? "w-full max-w-md flex-1 space-y-2.5 text-base"
          : "flex-1 text-sm",
      )}
    >
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => {
          const percent = formatSegmentPercent(segment.value, total);

          return (
            <li
              key={segment.label}
              className="flex items-center justify-between gap-3"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded-full",
                    isExpanded ? "size-3" : "size-2.5",
                    segment.className ?? "",
                  )}
                  style={
                    segment.colorVar
                      ? { backgroundColor: `var(${segment.colorVar})` }
                      : undefined
                  }
                  aria-hidden
                />
                <Text className="break-words">{segment.label}</Text>
              </span>
              <Text className="text-muted-foreground shrink-0 tabular-nums">
                {segment.value}{" "}
                <span className="text-muted-foreground/80">({percent}%)</span>
              </Text>
            </li>
          );
        })}
    </ul>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-4",
        isExpanded
          ? "min-h-[min(50vh,28rem)] w-full flex-col justify-center px-2 py-4 sm:flex-row sm:items-center sm:gap-10"
          : "flex-wrap",
      )}
    >
      {ring}
      {total > 0 ? legend : null}
    </div>
  );
}
