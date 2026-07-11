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
  /** When true (default), label text is rendered uppercase. */
  readonly labelUppercase?: boolean;
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

function isHorizontalLabelPosition(
  position: CardLabelPosition,
): position is "left" | "right" {
  return position === "left" || position === "right";
}

export function CardFieldValue({
  value,
  label,
  showLabel = false,
  labelPosition = "above",
  labelUppercase = true,
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
          "text-muted-foreground text-[11px]",
          labelUppercase && "uppercase tracking-wide",
          labelClassName,
        )}
      >
        {label}
      </Text>
    ) : null;

  const valueElement = (
    <span
      data-card-field-value=""
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

  const horizontal = isHorizontalLabelPosition(labelPosition);
  const labelFirst = labelPosition === "above" || labelPosition === "left";

  return (
    <div
      className={cn(
        "flex min-w-0 gap-0.5",
        horizontal ? "flex-row items-center gap-2" : "flex-col",
        className,
      )}
      style={style}
    >
      {labelFirst ? (
        <>
          {labelElement}
          {valueElement}
        </>
      ) : (
        <>
          {valueElement}
          {labelElement}
        </>
      )}
    </div>
  );
}
