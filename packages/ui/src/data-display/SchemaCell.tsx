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
  readonly fallbackImageUrl?: string | null;
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
  fallbackImageUrl,
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

  if (fieldType === "image") {
    const fileValue =
      typeof value === "object" &&
      value !== null &&
      "downloadUrl" in value &&
      typeof (value as { downloadUrl: unknown }).downloadUrl === "string"
        ? (value as { downloadUrl: string; fileName?: string })
        : null;
    const imageUrl = fileValue?.downloadUrl ?? fallbackImageUrl ?? null;

    if (imageUrl) {
      return (
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          className={fileValue ? undefined : "opacity-80"}
        >
          <img
            src={imageUrl}
            alt={fileValue?.fileName ?? "Image"}
            className="h-10 w-auto max-w-[120px] rounded object-contain"
          />
        </a>
      );
    }
  }

  if (
    fieldType === "document" &&
    typeof value === "object" &&
    value !== null &&
    "fileName" in value
  ) {
    const fileValue = value as {
      fileName: string;
      downloadUrl?: string;
    };
    if (fileValue.downloadUrl) {
      return (
        <a
          href={fileValue.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          {fileValue.fileName}
        </a>
      );
    }
    return <span>{fileValue.fileName}</span>;
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
