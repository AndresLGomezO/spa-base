import { type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface SegmentedSwitchOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly ariaLabel: string;
}

export interface SegmentedSwitchProps<T extends string> {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly options: readonly SegmentedSwitchOption<T>[];
  readonly ariaLabel: string;
  readonly fullWidth?: boolean;
  readonly className?: string;
}

export function SegmentedSwitch<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  fullWidth = false,
  className,
}: SegmentedSwitchProps<T>) {
  const activeIndex = options.findIndex((option) => option.value === value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const segmentCount = options.length;
  const segmentSize = `calc((100% - 0.5rem) / ${segmentCount})`;
  const thumbLeft = `calc(0.25rem + ${safeIndex} * ((100% - 0.5rem) / ${segmentCount}))`;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "bg-neutral-100/90 ring-border/40 relative flex rounded-lg p-1 ring-1 ring-inset dark:bg-neutral-900/35",
        fullWidth ? "w-full" : "inline-flex w-auto",
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-background pointer-events-none absolute top-1 bottom-1 rounded-md shadow-sm transition-[left] duration-200 ease-out"
        style={{
          width: segmentSize,
          left: thumbLeft,
        }}
      />

      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 box-border flex min-h-10 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-md border-0 bg-transparent px-3 py-1.5 text-xs font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              isActive
                ? "text-foreground"
                : "text-neutral-400 dark:text-neutral-500",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
