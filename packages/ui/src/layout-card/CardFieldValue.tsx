import { cn } from "@repo/theme/utils";

import { Text } from "../typography/Text.js";

export interface CardFieldValueProps {
  readonly value: React.ReactNode;
  readonly label?: string;
  readonly showLabel?: boolean;
  readonly className?: string;
  readonly valueClassName?: string;
  readonly labelClassName?: string;
  readonly textSize?: number;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
}

export function CardFieldValue({
  value,
  label,
  showLabel = false,
  className,
  valueClassName,
  labelClassName,
  textSize,
  textThin,
  textBold,
  textItalic,
  textUnderline,
}: CardFieldValueProps) {
  const displayValue =
    value === null || value === undefined || value === "" ? "—" : value;
  const resolvedTextSize = textSize !== undefined ? textSize : undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      {showLabel && label ? (
        <Text
          className={cn(
            "text-muted-foreground text-[11px] uppercase tracking-wide",
            labelClassName,
          )}
        >
          {label}
        </Text>
      ) : null}
      <span
        className={cn(
          "text-foreground truncate",
          resolvedTextSize === undefined && "text-sm",
          textBold ? "font-bold" : textThin ? "font-light" : "font-medium",
          textItalic && "italic",
          textUnderline && "underline",
          valueClassName,
        )}
        style={
          resolvedTextSize !== undefined
            ? { fontSize: resolvedTextSize }
            : undefined
        }
      >
        {displayValue}
      </span>
    </div>
  );
}
