import { useMemo } from "react";

import type { FieldAccessLevel } from "@repo/entities";
import { FieldLabel } from "@repo/ui";

import {
  formatFieldLabel,
  type EntityCatalogEntry,
} from "../../entities/entity-catalog";

export interface FieldRuleDraft {
  readonly resource: string;
  readonly fields: readonly {
    readonly field: string;
    readonly access: FieldAccessLevel;
  }[];
}

interface FieldPermissionEditorProps {
  readonly entities: readonly EntityCatalogEntry[];
  readonly value: readonly FieldRuleDraft[];
  readonly onChange: (value: readonly FieldRuleDraft[]) => void;
}

export function FieldPermissionEditor({
  entities,
  value,
  onChange,
}: FieldPermissionEditorProps) {
  const entityNames = useMemo(
    () => entities.map((entity) => entity.name),
    [entities],
  );

  const updateRule = (
    resource: string,
    field: string,
    access: FieldAccessLevel,
  ) => {
    const next = [...value];
    const ruleIndex = next.findIndex((rule) => rule.resource === resource);
    if (ruleIndex === -1) {
      onChange([...next, { resource, fields: [{ field, access }] }]);
      return;
    }

    const rule = next[ruleIndex];
    if (!rule) return;

    const fields = [...rule.fields];
    const fieldIndex = fields.findIndex((item) => item.field === field);
    if (fieldIndex === -1) {
      fields.push({ field, access });
    } else {
      fields[fieldIndex] = { field, access };
    }

    next[ruleIndex] = { resource, fields };
    onChange(next);
  };

  const getAccess = (resource: string, field: string): FieldAccessLevel => {
    const rule = value.find((item) => item.resource === resource);
    const fieldRule = rule?.fields.find((item) => item.field === field);
    return fieldRule?.access ?? "write";
  };

  if (entityNames.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {entityNames.map((entityName) => {
        const entity = entities.find((item) => item.name === entityName);
        if (!entity) return null;

        return (
          <div
            key={entityName}
            className="mx-0.5 space-y-2 rounded-md border p-4"
          >
            <FieldLabel>{entityName}</FieldLabel>
            <div className="space-y-2">
              {Object.keys(entity.fields).map((fieldName) => (
                <div
                  key={fieldName}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm">
                    {formatFieldLabel(fieldName, entity)}
                  </span>
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                    value={getAccess(entityName, fieldName)}
                    onChange={(event) =>
                      updateRule(
                        entityName,
                        fieldName,
                        event.target.value as FieldAccessLevel,
                      )
                    }
                  >
                    <option value="write">Write</option>
                    <option value="read">Read</option>
                    <option value="none">None</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
