import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";

import { cn } from "@repo/theme/utils";

import {
  getAdjacentIndex,
  getIndexFromScrollTop,
  getScrollTopForIndex,
  SCROLL_COLUMN_ITEM_HEIGHT,
  SCROLL_COLUMN_PADDING,
  SCROLL_COLUMN_VIEWPORT_HEIGHT,
} from "./date-picker-scroll-column.utils.js";

interface DatePickerScrollColumnProps<T> {
  readonly values: readonly T[];
  readonly selected: T;
  readonly onSelect: (value: T) => void;
  readonly formatValue: (value: T) => string;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly isSelected?: (value: T, selected: T) => boolean;
}

function defaultIsSelected<T>(value: T, selected: T): boolean {
  return value === selected;
}

export function DatePickerScrollColumn<T>({
  values,
  selected,
  onSelect,
  formatValue,
  ariaLabel,
  className,
  isSelected = defaultIsSelected,
}: DatePickerScrollColumnProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEndTimerRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const selectedIndex = Math.max(
    0,
    values.findIndex((value) => isSelected(value, selected)),
  );

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const element = scrollRef.current;
      if (!element) {
        return;
      }
      isProgrammaticScrollRef.current = true;
      element.scrollTo({
        top: getScrollTopForIndex(index),
        behavior,
      });
      window.setTimeout(
        () => {
          isProgrammaticScrollRef.current = false;
        },
        behavior === "smooth" ? 200 : 0,
      );
    },
    [],
  );

  useEffect(() => {
    scrollToIndex(selectedIndex, "auto");
  }, [scrollToIndex, selectedIndex]);

  function handleScroll() {
    if (isProgrammaticScrollRef.current) {
      return;
    }

    if (scrollEndTimerRef.current != null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      const element = scrollRef.current;
      if (!element) {
        return;
      }

      const index = getIndexFromScrollTop(element.scrollTop, values.length);
      const nextValue = values[index];
      if (nextValue !== undefined && !isSelected(nextValue, selected)) {
        onSelect(nextValue);
      }
    }, 80);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();
    const delta = event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = getAdjacentIndex(selectedIndex, delta, values.length);
    const nextValue = values[nextIndex];
    if (nextValue !== undefined) {
      onSelect(nextValue);
      scrollToIndex(nextIndex, "smooth");
    }
  }

  return (
    <div className={cn("relative flex-1", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-8 -translate-y-1/2 rounded-md border border-border/60 bg-muted/30"
      />
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={ariaLabel}
        aria-activedescendant={`${ariaLabel}-${selectedIndex}`}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="scrollbar-none snap-y snap-mandatory overflow-y-auto overscroll-contain"
        style={{
          height: SCROLL_COLUMN_VIEWPORT_HEIGHT,
          paddingTop: SCROLL_COLUMN_PADDING,
          paddingBottom: SCROLL_COLUMN_PADDING,
        }}
      >
        {values.map((value, index) => {
          const active = isSelected(value, selected);
          return (
            <button
              key={`${ariaLabel}-${index}`}
              id={`${ariaLabel}-${index}`}
              type="button"
              role="option"
              aria-selected={active}
              className={cn(
                "flex w-full snap-center items-center justify-center text-xs transition-colors",
                active
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              style={{ height: SCROLL_COLUMN_ITEM_HEIGHT }}
              onClick={() => {
                onSelect(value);
                scrollToIndex(index, "smooth");
              }}
            >
              {formatValue(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
