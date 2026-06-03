import { cn } from "@repo/theme/utils";

import {
  formatDateDisplayValue,
  type DateDisplayFormat,
} from "../data-display/format-display-value.js";
import { Text } from "../typography/Text.js";

import type { CardLabelPosition } from "./types.js";

export interface CardFieldDateProps {
  readonly value: unknown;
  readonly dateDisplayFormat?: DateDisplayFormat;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly label?: string;
  readonly showLabel?: boolean;
  readonly labelPosition?: CardLabelPosition;
  readonly className?: string;
  readonly textSize?: number;
  readonly textThin?: boolean;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
}

function formatCardDateValue(
  value: unknown,
  options: {
    readonly dateDisplayFormat: DateDisplayFormat;
    readonly locale: string;
    readonly timeZone: string;
  },
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return formatDateDisplayValue(value, options);
  }

  if (typeof value === "string") {
    return formatDateDisplayValue(value, options);
  }

  return "—";
}

export function CardFieldDate({
  value,
  dateDisplayFormat = "datetime",
  locale = "en",
  timeZone = "UTC",
  label,
  showLabel = false,
  labelPosition = "above",
  className,
  textSize,
  textThin,
  textBold,
  textItalic,
  textUnderline,
}: CardFieldDateProps) {
  const formattedValue = formatCardDateValue(value, {
    dateDisplayFormat,
    locale,
    timeZone,
  });
  const resolvedTextSize = textSize !== undefined ? textSize : undefined;

  const labelElement =
    showLabel && label ? (
      <Text className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </Text>
    ) : null;

  const valueElement = (
    <span
      className={cn(
        "text-foreground truncate tabular-nums",
        resolvedTextSize === undefined && "text-sm",
        textBold ? "font-bold" : textThin ? "font-light" : "font-medium",
        textItalic && "italic",
        textUnderline && "underline",
      )}
      style={
        resolvedTextSize !== undefined ? { fontSize: resolvedTextSize } : undefined
      }
    >
      {formattedValue}
    </span>
  );

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
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
