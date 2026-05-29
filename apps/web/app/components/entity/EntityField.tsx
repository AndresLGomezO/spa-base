import { Checkbox, FieldError, FieldLabel, Input } from "@repo/ui";

import {
  formatFieldLabel,
  getEntityDefinition,
  type EntityName,
} from "../../entities/entity-catalog";
import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
} from "./entity-field-utils";

interface EntityFieldProps {
  readonly entityName: EntityName;
  readonly fieldName: string;
  readonly value: unknown;
  readonly error?: string;
  readonly onChange: (fieldName: string, value: unknown) => void;
}

export function EntityField({
  entityName,
  fieldName,
  value,
  error,
  onChange,
}: EntityFieldProps) {
  const entity = getEntityDefinition(entityName).entity;
  const fields = entity.metadata.fields as Record<
    string,
    {
      readonly type: string;
      readonly required: boolean;
      readonly default?: unknown;
    }
  >;
  const meta = fields[fieldName];
  if (!meta) return null;

  const inputId = `${entityName}-${fieldName}`;
  const label = formatFieldLabel(fieldName);

  if (meta.type === "boolean") {
    return (
      <div className="flex flex-col gap-1">
        <Checkbox
          id={inputId}
          label={label}
          checked={Boolean(value)}
          onChange={(event) => onChange(fieldName, event.target.checked)}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  if (meta.type === "date") {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
        <Input
          id={inputId}
          type="datetime-local"
          hasError={Boolean(error)}
          value={isoToDatetimeLocalValue(
            typeof value === "string" ? value : null,
          )}
          onChange={(event) =>
            onChange(fieldName, datetimeLocalValueToIso(event.target.value))
          }
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  if (meta.type === "number") {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
        <Input
          id={inputId}
          type="number"
          hasError={Boolean(error)}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) =>
            onChange(
              fieldName,
              event.target.value === ""
                ? undefined
                : Number(event.target.value),
            )
          }
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={inputId} required={meta.required}>
        {label}
      </FieldLabel>
      <Input
        id={inputId}
        type="text"
        hasError={Boolean(error)}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(fieldName, event.target.value)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
