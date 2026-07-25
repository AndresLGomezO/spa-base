import { useEffect, useId, useState } from "react";

import { cn } from "@repo/theme/utils";

export interface ProgressBarProps {
  readonly label?: string;
  readonly percent: number;
  readonly caption?: string;
  readonly className?: string;
  readonly ariaLabel?: string;
}

/** Clamp a percent-like value to an integer in [0, 100]. */
export function clampProgressPercent(percent: number): number | null {
  if (!Number.isFinite(percent)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(percent)));
}

/** Themed fills with solid fallbacks (tenant overrides always set primary). */
const TRACK_FILL =
  "color-mix(in oklab, var(--color-primary, #008bd4) 18%, var(--color-muted, #d7d8e0))";
const BAR_FILL = "var(--color-primary, #008bd4)";

export function ProgressBar({
  label,
  percent,
  caption,
  className,
  ariaLabel,
}: ProgressBarProps) {
  const clamped = clampProgressPercent(percent);
  const shimmerId = useId().replace(/:/g, "");
  const [fillWidth, setFillWidth] = useState(0);

  useEffect(() => {
    if (clamped === null) {
      return;
    }
    setFillWidth(0);
    // Double rAF so the 0% frame paints before transitioning to the target.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setFillWidth(clamped);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [clamped]);

  if (clamped === null) {
    return null;
  }

  const resolvedLabel = label?.trim() || undefined;
  const resolvedCaption = caption?.trim() || undefined;
  const accessible =
    ariaLabel?.trim() ||
    [resolvedLabel, `${clamped}%`, resolvedCaption].filter(Boolean).join(" — ");

  return (
    <div
      className={cn("flex w-full max-w-md flex-col gap-1.5", className)}
      role="img"
      aria-label={accessible}
    >
      <style>{`
        @keyframes progress-bar-shimmer-${shimmerId} {
          0%, 100% { background-position: 120% 0; }
          50% { background-position: -20% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .progress-bar-fill-${shimmerId} {
            transition: none !important;
          }
          .progress-bar-shimmer-${shimmerId} {
            animation: none !important;
          }
        }
      `}</style>
      {resolvedLabel ? (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-foreground font-medium">{resolvedLabel}</span>
          <span className="text-muted-foreground tabular-nums">{clamped}%</span>
        </div>
      ) : (
        <div className="text-muted-foreground text-right text-xs tabular-nums">
          {clamped}%
        </div>
      )}
      <div
        className="h-4 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: TRACK_FILL }}
      >
        <div
          className={cn(
            `progress-bar-fill-${shimmerId}`,
            "relative h-full overflow-hidden rounded-full",
            fillWidth > 0 && "min-w-1",
          )}
          style={{
            width: `${fillWidth}%`,
            backgroundColor: BAR_FILL,
            transition: "width 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span
            aria-hidden
            className={cn(
              `progress-bar-shimmer-${shimmerId}`,
              "pointer-events-none absolute inset-0",
            )}
            style={{
              background:
                "linear-gradient(105deg, transparent 35%, color-mix(in oklab, white 45%, transparent) 50%, transparent 65%)",
              backgroundSize: "220% 100%",
              animation: `progress-bar-shimmer-${shimmerId} 2s ease-in-out infinite`,
            }}
          />
        </div>
      </div>
      {resolvedCaption ? (
        <p className="text-muted-foreground text-xs">{resolvedCaption}</p>
      ) : null}
    </div>
  );
}
