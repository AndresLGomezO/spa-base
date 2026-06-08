import type { CSSProperties } from "react";

import { cn } from "@repo/theme/utils";

import { Text } from "../typography/Text.js";

import type { CardLabelPosition } from "./types.js";
import { cardTextColorClassName, type CardTextColor } from "./text-colors.js";

export interface CardFieldValueProps {
  readonly value: React.ReactNode;
  readonly label?: string;
  readonly showLabel?: boolean;
  readonly labelPosition?: CardLabelPosition;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly valueClassName?: string;
  readonly labelClassName?: string;
  readonly textSize?: number;
  readonly valueStyle?: CSSProperties;
  readonly textColor?: CardTextColor;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
  readonly allowEmpty?: boolean;
}

export function CardFieldValue({
  value,
  label,
  showLabel = false,
  labelPosition = "above",
  className,
  style,
  valueClassName,
  labelClassName,
  textSize,
  valueStyle,
  textColor,
  textThin,
  textBold,
  textItalic,
  textUnderline,
  allowEmpty = false,
}: CardFieldValueProps) {
  const displayValue =
    value === null || value === undefined || (value === "" && !allowEmpty)
      ? "—"
      : value;
  const resolvedTextSize = textSize !== undefined ? textSize : undefined;

  const labelElement =
    showLabel && label ? (
      <Text
        className={cn(
          "text-muted-foreground text-[11px] uppercase tracking-wide",
          labelClassName,
        )}
      >
        {label}
      </Text>
    ) : null;

  const valueElement = (
    <span
      className={cn(
        cardTextColorClassName(textColor),
        resolvedTextSize === undefined && "text-sm",
        textBold ? "font-bold" : textThin ? "font-light" : "font-medium",
        textItalic && "italic",
        textUnderline && "underline",
        valueClassName,
      )}
      style={{
        ...(resolvedTextSize !== undefined
          ? { fontSize: resolvedTextSize }
          : {}),
        ...valueStyle,
      }}
    >
      {displayValue}
    </span>
  );

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      style={style}
    >
      {labelPosition === "below" ? (
        <>
          {valueElement}
          {labelElement}
        </>
      ) : (
        <>
          {labelElement}
          {valueElement}
        </>
      )}
    </div>
  );
}
