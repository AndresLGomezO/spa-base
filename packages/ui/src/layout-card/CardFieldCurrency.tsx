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
}: CardFieldCurrencyProps) {
  const displayAmount =
    amount === null || amount === undefined || amount === "" ? "—" : amount;

  const labelElement =
    showLabel && label ? (
      <Text className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </Text>
    ) : null;

  const valueElement = (
    <>
      <span
        className={cn("text-lg font-bold tracking-tight", toneClasses[tone])}
      >
        {displayAmount}
      </span>
      {currency ? (
        <Text className="text-muted-foreground text-xs">{currency}</Text>
      ) : null}
    </>
  );

  return (
    <div className={cn("flex min-w-0 flex-col items-end gap-0.5", className)}>
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
