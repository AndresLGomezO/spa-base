import { cn } from "@repo/theme/utils";

import { resolveChartGlowStrokeColor } from "./chart-glow-filter.js";

export interface SplitBarSegment {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export interface SplitBarProps {
  readonly title?: string;
  readonly segments: readonly SplitBarSegment[];
  readonly className?: string;
  readonly ariaLabel?: string;
}

export interface NormalizedSplitSegment {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly color: string;
}

/**
 * Drop non-positive / non-finite values, then normalize remaining values to
 * percentages that sum to 100. Returns empty when nothing usable remains.
 */
export function normalizeSplitSegments(
  segments: readonly SplitBarSegment[],
): readonly NormalizedSplitSegment[] {
  const usable = segments
    .map((segment, index) => {
      const value = segment.value;
      if (!Number.isFinite(value) || value <= 0) {
        return null;
      }
      const label = segment.label.trim();
      if (!label) {
        return null;
      }
      return {
        id: segment.id.trim() || `segment-${index}`,
        label,
        value,
        color:
          segment.color?.trim() ||
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

export function SplitBar({
  title,
  segments,
  className,
  ariaLabel,
}: SplitBarProps) {
  const normalized = normalizeSplitSegments(segments);
  if (normalized.length === 0) {
    return null;
  }

  const resolvedTitle = title?.trim() || undefined;
  const accessible =
    ariaLabel?.trim() ||
    [
      resolvedTitle,
      ...normalized.map(
        (segment) => `${segment.label} ${Math.round(segment.percent)}%`,
      ),
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-3",
        className,
      )}
      role="img"
      aria-label={accessible}
    >
      {resolvedTitle ? (
        <p className="text-foreground text-center text-xs font-medium">
          {resolvedTitle}
        </p>
      ) : null}
      <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
        {normalized.map((segment) => (
          <div
            key={segment.id}
            className="h-full"
            style={{
              width: `${segment.percent}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${Math.round(segment.percent)}%`}
          />
        ))}
      </div>
      <ul className="flex w-full flex-col items-center gap-2">
        {normalized.map((segment) => (
          <li
            key={segment.id}
            className="text-muted-foreground inline-flex items-center gap-2 text-xs"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden
            />
            <span className="inline-flex items-baseline gap-1">
              <span>{segment.label}</span>
              <span className="tabular-nums">
                {Math.round(segment.percent)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
