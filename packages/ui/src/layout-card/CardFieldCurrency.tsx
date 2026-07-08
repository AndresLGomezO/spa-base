import type { CSSProperties } from "react";

import { cn } from "@repo/theme/utils";

import { Text } from "../typography/Text.js";

import type { CardLabelPosition } from "./types.js";

export type CardCurrencyTone = "positive" | "negative" | "neutral";

export interface CardFieldCurrencyProps {
  readonly amount: React.ReactNode;
  readonly currency?: React.ReactNode;
  readonly tone?: CardCurrencyTone;
  readonly label?: string;
  readonly showLabel?: boolean;
  readonly labelPosition?: CardLabelPosition;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly valueClassName?: string;
  readonly valueStyle?: CSSProperties;
  readonly labelClassName?: string;
  readonly textSize?: number;
  readonly showToneColors?: boolean;
}

const toneClasses: Record<CardCurrencyTone, string> = {
  positive: "text-success",
  negative: "text-destructive",
  neutral: "text-foreground",
};

function coerceNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function resolveCurrencyTone(value: unknown): CardCurrencyTone {
  const numeric = coerceNumericValue(value);
  if (numeric === null) {
    return "neutral";
  }
  if (numeric > 0) {
    return "positive";
  }
  if (numeric < 0) {
    return "negative";
  }
  return "neutral";
}

export function CardFieldCurrency({
  amount,
  currency,
  tone = "neutral",
  label,
  showLabel = false,
  labelPosition = "above",
  className,
  style,
  valueClassName,
  valueStyle,
  labelClassName,
  textSize,
  showToneColors = false,
}: CardFieldCurrencyProps) {
  const displayAmount =
    amount === null || amount === undefined || amount === "" ? "—" : amount;
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
    <>
      <span
        className={cn(
          "font-bold tracking-tight",
          resolvedTextSize === undefined &&
            valueStyle?.fontSize === undefined &&
            "text-lg",
          showToneColors && toneClasses[tone],
          valueClassName,
        )}
        style={{
          ...(resolvedTextSize !== undefined
            ? { fontSize: resolvedTextSize }
            : {}),
          ...valueStyle,
        }}
      >
        {displayAmount}
      </span>
      {currency ? (
        <Text className="text-muted-foreground text-xs">{currency}</Text>
      ) : null}
    </>
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
