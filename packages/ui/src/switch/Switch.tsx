import { type KeyboardEvent, type ReactNode, useCallback } from "react";

import { cn } from "@repo/theme/utils";

export type SwitchVariant = "ios" | "squared";

export interface SwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly label?: ReactNode;
  readonly className?: string;
  readonly variant?: SwitchVariant;
  readonly width?: number;
  readonly height?: number;
  readonly trueLabel?: ReactNode;
  readonly falseLabel?: ReactNode;
  readonly fullWidth?: boolean;
  readonly ariaLabelledBy?: string;
}

const DEFAULT_IOS_WIDTH = 44;
const DEFAULT_IOS_HEIGHT = 24;
const DEFAULT_SQUARED_HEIGHT = 40;
const TRACK_PADDING = 2;

function IosSwitch({
  checked,
  onChange,
  disabled = false,
  id,
  label,
  className,
  width = DEFAULT_IOS_WIDTH,
  height = DEFAULT_IOS_HEIGHT,
}: SwitchProps) {
  const thumbSize = height - TRACK_PADDING * 2;
  const thumbOffset = checked
    ? width - thumbSize - TRACK_PADDING
    : TRACK_PADDING;

  const toggle = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, disabled, onChange]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggle();
    }
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "text-foreground inline-flex cursor-pointer items-center gap-2 text-sm",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-muted",
        )}
        style={{ width, height }}
      >
        <span
          aria-hidden
          className="bg-background pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm transition-[left] duration-200 ease-out"
          style={{
            width: thumbSize,
            height: thumbSize,
            left: thumbOffset,
          }}
        />
      </button>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

function SquaredBooleanSwitch({
  checked,
  onChange,
  disabled = false,
  className,
  width,
  height = DEFAULT_SQUARED_HEIGHT,
  trueLabel = "Yes",
  falseLabel = "No",
  fullWidth = true,
  ariaLabelledBy,
}: SwitchProps) {
  function selectTrue() {
    if (!disabled && !checked) {
      onChange(true);
    }
  }

  function selectFalse() {
    if (!disabled && checked) {
      onChange(false);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      aria-disabled={disabled || undefined}
      className={cn(
        "border-border inline-flex overflow-hidden rounded-md border transition-opacity duration-200 ease-out",
        fullWidth ? "w-full" : "w-auto",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      style={{
        width: width !== undefined ? width : undefined,
        height,
      }}
    >
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={selectTrue}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-center px-3 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-inset",
          checked
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground hover:bg-muted/60",
        )}
      >
        {trueLabel}
      </button>
      <div className="bg-border w-px shrink-0 self-stretch" aria-hidden />
      <button
        type="button"
        role="radio"
        aria-checked={!checked}
        disabled={disabled}
        onClick={selectFalse}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-center px-3 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-inset",
          !checked
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground hover:bg-muted/60",
        )}
      >
        {falseLabel}
      </button>
    </div>
  );
}

export function Switch(props: SwitchProps) {
  if (props.variant === "squared") {
    return <SquaredBooleanSwitch {...props} />;
  }

  return <IosSwitch {...props} />;
}
