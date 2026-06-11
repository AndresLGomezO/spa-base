import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@repo/theme/utils";

export const COLLAPSIBLE_SEGMENTED_SWITCHER_TRACK_CLASS =
  "bg-muted/90 ring-border/40 relative inline-flex w-fit max-w-full rounded-lg p-1 ring-1 ring-inset";

export const COLLAPSIBLE_SEGMENTED_SWITCHER_SEGMENT_CLASS =
  "relative z-10 box-border flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-md border-0 bg-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

export interface CollapsibleSegmentedSwitcherOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly ariaLabel: string;
}

export interface CollapsibleSegmentedSwitcherProps<T extends string> {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly options: readonly CollapsibleSegmentedSwitcherOption<T>[];
  readonly ariaLabel: string;
  readonly className?: string;
  readonly collapsible?: boolean;
  readonly segmentWidth?: string;
}

export function CollapsibleSegmentedSwitcher<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  collapsible = true,
  segmentWidth = "2.75rem",
}: CollapsibleSegmentedSwitcherProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const activeIndex = options.findIndex((option) => option.value === value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeOption = options[safeIndex] ?? options[0];
  const showExpanded = !collapsible || expanded;
  const thumbLeft = `calc(0.25rem + ${safeIndex} * (${segmentWidth} + 0.25rem))`;

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleSelect = useCallback(
    (nextValue: T) => {
      onChange(nextValue);
      collapse();
    },
    [collapse, onChange],
  );

  useEffect(() => {
    if (!collapsible || !expanded) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        collapse();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [collapse, collapsible, expanded]);

  return (
    <div ref={rootRef} className={className}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={cn(
          COLLAPSIBLE_SEGMENTED_SWITCHER_TRACK_CLASS,
          showExpanded ? "gap-1" : "gap-0",
        )}
      >
        {showExpanded ? (
          <>
            <span
              aria-hidden
              className="bg-background pointer-events-none absolute top-1 bottom-1 rounded-md shadow-sm transition-[left] duration-200 ease-out"
              style={{
                width: segmentWidth,
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
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    COLLAPSIBLE_SEGMENTED_SWITCHER_SEGMENT_CLASS,
                    isActive
                      ? "text-foreground"
                      : "text-text-tertiary hover:text-foreground",
                  )}
                  style={{ width: segmentWidth }}
                >
                  {option.label}
                </button>
              );
            })}
          </>
        ) : (
          <button
            type="button"
            role="radio"
            aria-checked
            aria-label={activeOption?.ariaLabel}
            aria-expanded={false}
            onClick={() => setExpanded(true)}
            className={cn(
              COLLAPSIBLE_SEGMENTED_SWITCHER_SEGMENT_CLASS,
              "bg-background text-foreground w-auto min-w-11 shadow-sm",
            )}
          >
            {activeOption?.label}
            <ChevronDown aria-hidden className="size-3.5 shrink-0 opacity-70" />
          </button>
        )}
      </div>
    </div>
  );
}
