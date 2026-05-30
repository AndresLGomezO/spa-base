import type { ReactNode } from "react";

import {
  formatDisplayValue,
  type DateDisplayFormat,
  type DisplayFieldType,
  type DisplayFormat,
} from "./format-display-value";
import { BooleanCell } from "./BooleanCell";

export interface SchemaCellProps {
  readonly value: unknown;
  readonly fieldType?: DisplayFieldType;
  readonly displayFormat?: DisplayFormat;
  readonly dateDisplayFormat?: DateDisplayFormat;
  readonly fieldName?: string;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly trueLabel?: string;
  readonly falseLabel?: string;
  readonly renderValue?: (value: unknown) => ReactNode;
}

export function SchemaCell({
  value,
  fieldType,
  displayFormat,
  dateDisplayFormat,
  fieldName,
  locale,
  timeZone,
  trueLabel,
  falseLabel,
  renderValue,
}: SchemaCellProps) {
  if (renderValue) {
    return <>{renderValue(value)}</>;
  }

  if (fieldType === "boolean" || typeof value === "boolean") {
    const boolValue = Boolean(value);
    return (
      <BooleanCell
        value={boolValue}
        trueLabel={trueLabel}
        falseLabel={falseLabel}
      />
    );
  }

  const text = formatDisplayValue(value, {
    fieldType,
    displayFormat,
    dateDisplayFormat,
    fieldName,
    locale,
    timeZone,
  });

  return <span title={text}>{text}</span>;
}
