import { useEffect, useState } from "react";
import { FieldError, FieldLabel } from "@repo/ui";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { listEntity } from "../../lib/api-client";

interface RelationPickerProps {
  readonly entityName: EntityName;
  readonly fieldName: string;
  readonly targetEntity: string;
  readonly value: unknown;
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly hideLabel?: boolean;
  readonly onChange: (
    fieldName: string,
    value: unknown,
    displayRecord?: Record<string, unknown> | null,
  ) => void;
}

interface RelationOption {
  readonly id: string;
  readonly label: string;
  readonly record: Record<string, unknown>;
}

export function RelationPicker({
  entityName,
  fieldName,
  targetEntity,
  value,
  label,
  required,
  error,
  readOnly = false,
  hideLabel = false,
  onChange,
}: RelationPickerProps) {
  const definition = useEntityDefinition(entityName);
  const [options, setOptions] = useState<readonly RelationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const inputId = `${entityName}-${fieldName}`;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      try {
        const result = await listEntity<Record<string, unknown>>(targetEntity, {
          limit: 100,
        });
        if (cancelled) return;
        setOptions(
          result.items.map((item) => ({
            id: String(item.id),
            label: typeof item.name === "string" ? item.name : String(item.id),
            record: item,
          })),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetEntity]);

  return (
    <div className="flex flex-col gap-1">
      {hideLabel ? null : (
        <FieldLabel htmlFor={inputId} required={required}>
          {label || formatFieldLabel(fieldName, definition)}
        </FieldLabel>
      )}
      <select
        id={inputId}
        aria-label={
          hideLabel
            ? label || formatFieldLabel(fieldName, definition)
            : undefined
        }
        className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm"
        disabled={isLoading || readOnly}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (!nextValue) {
            onChange(fieldName, "", null);
            return;
          }
          const option = options.find((entry) => entry.id === nextValue);
          onChange(fieldName, nextValue, option?.record ?? null);
        }}
      >
        <option value="">{isLoading ? "Loading..." : "Select..."}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
