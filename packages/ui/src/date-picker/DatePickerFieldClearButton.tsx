import { X } from "lucide-react";

import { cn } from "@repo/theme/utils";

import { focusRingInsetClassName } from "../focus-ring/focus-ring-classes.js";

interface DatePickerFieldClearButtonProps {
  readonly visible: boolean;
  readonly ariaLabel: string;
  readonly onClear: () => void;
}

export function DatePickerFieldClearButton({
  visible,
  ariaLabel,
  onClear,
}: DatePickerFieldClearButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-hover/80 focus-visible:ring-focus/40 absolute top-1/2 right-8 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
        focusRingInsetClassName,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClear();
      }}
    >
      <X className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

export function datePickerCompactInputPadding(
  compact: boolean,
  showClearButton: boolean,
): string | undefined {
  if (!compact) {
    return undefined;
  }

  return showClearButton ? "pr-16" : "pr-10";
}
