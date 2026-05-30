import { useEffect, useState } from "react";
import { Checkbox, FieldError, FieldLabel, Text } from "@repo/ui";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { listEntity } from "../../lib/api-client";
import { RelationPickerSkeleton } from "../loading/RelationPickerSkeleton";

interface ManyToManyRelationPickerProps {
  readonly entityName: EntityName;
  readonly fieldName: string;
  readonly targetEntity: string;
  readonly value: unknown;
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly onChange: (fieldName: string, value: unknown) => void;
}

interface RelationOption {
  readonly id: string;
  readonly label: string;
}

function normalizeValue(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function ManyToManyRelationPicker({
  entityName,
  fieldName,
  targetEntity,
  value,
  label,
  required,
  error,
  readOnly = false,
  onChange,
}: ManyToManyRelationPickerProps) {
  const definition = useEntityDefinition(entityName);
  const [options, setOptions] = useState<readonly RelationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const selectedIds = new Set(normalizeValue(value));

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

  function toggleOption(optionId: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(optionId);
    } else {
      next.delete(optionId);
    }
    onChange(fieldName, [...next]);
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel required={required}>
        {label || formatFieldLabel(fieldName, definition)}
      </FieldLabel>
      {isLoading ? (
        <RelationPickerSkeleton />
      ) : options.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          No related records available.
        </Text>
      ) : (
        <div className="border-border space-y-2 rounded-md border p-3">
          {options.map((option) => (
            <Checkbox
              key={option.id}
              id={`${entityName}-${fieldName}-${option.id}`}
              label={option.label}
              checked={selectedIds.has(option.id)}
              disabled={readOnly}
              onChange={(event) =>
                toggleOption(option.id, event.target.checked)
              }
            />
          ))}
        </div>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
