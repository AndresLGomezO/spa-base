import {
  defineEntity,
  getAllEntities,
  getEntity,
  type DefinedEntity,
  type EntityUIConfig,
  type FieldComponentType,
  type FieldConfig,
  type FieldDefinitions,
} from "@repo/entities";

import type { EntityDefinitionRecord, FieldDefinitionRecord } from "./types.js";

export class DynamicEntityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DynamicEntityError";
  }
}

function fieldRecordToConfig(field: FieldDefinitionRecord): FieldConfig {
  switch (field.type) {
    case "string":
      return {
        type: "string",
        ...(field.required ? { required: true } : {}),
      };
    case "number":
      return {
        type: "number",
        ...(field.required ? { required: true } : {}),
      };
    case "boolean":
      return {
        type: "boolean",
        ...(field.required ? { required: true } : {}),
      };
    case "date":
      return {
        type: "date",
        ...(field.required ? { required: true } : {}),
      };
    case "enum":
      return {
        type: "enum",
        enumValues: field.enumValues ?? [],
        ...(field.required ? { required: true } : {}),
      };
    case "relation":
      return {
        type: "relation",
        ...(field.required ? { required: true } : {}),
        relation: {
          target: field.relation!.target,
          type: field.relation!.type,
          onDelete: "restrict",
        },
      };
    default:
      throw new DynamicEntityError(`Unsupported field type: ${field.type}`);
  }
}

function buildUiFromRecord(
  record: EntityDefinitionRecord,
): EntityUIConfig | undefined {
  if (record.ui) {
    return record.ui;
  }

  const fieldNames = record.fields.map((field) => field.name);
  const componentForType = (
    type: FieldDefinitionRecord["type"],
  ): FieldComponentType => {
    switch (type) {
      case "number":
        return "number" as const;
      case "boolean":
        return "toggle" as const;
      case "date":
        return "date" as const;
      case "relation":
        return "relation" as const;
      case "enum":
        return "select" as const;
      default:
        return "input" as const;
    }
  };

  return {
    nav: { label: record.label },
    views: [
      {
        type: "table",
        name: "default",
        fields: fieldNames,
      },
    ],
    forms: {
      create: {
        sections: [{ title: record.label, fields: fieldNames }],
      },
      edit: {
        sections: [{ title: record.label, fields: fieldNames }],
      },
    },
    fields: Object.fromEntries(
      record.fields.map((field, index) => [
        field.name,
        {
          ...(field.ui?.label ? { label: field.ui.label } : {}),
          component:
            (field.ui?.component as FieldComponentType | undefined) ??
            componentForType(field.type),
          ...(field.ui?.placeholder
            ? { placeholder: field.ui.placeholder }
            : {}),
          ...(field.ui?.displayFormat
            ? { displayFormat: field.ui.displayFormat }
            : {}),
          ...(field.ui?.dateDisplayFormat
            ? { dateDisplayFormat: field.ui.dateDisplayFormat }
            : {}),
          ...(field.ui?.filterable !== undefined
            ? { filterable: field.ui.filterable }
            : {}),
          ...(field.ui?.sortable !== undefined
            ? { sortable: field.ui.sortable }
            : {}),
          order: field.ui?.order ?? index,
        },
      ]),
    ) as EntityUIConfig["fields"],
  };
}

export function defineEntityFromRecord(
  record: EntityDefinitionRecord,
): DefinedEntity<string, FieldDefinitions> {
  const fields = Object.fromEntries(
    record.fields.map((field) => [field.name, fieldRecordToConfig(field)]),
  ) as FieldDefinitions;

  const ui = buildUiFromRecord(record);

  return defineEntity({
    name: record.name,
    fields,
    ...(record.tenantWideRead ? { tenantWideRead: true } : {}),
    ...(ui ? { ui } : {}),
  } as Parameters<typeof defineEntity>[0]) as DefinedEntity<
    string,
    FieldDefinitions
  >;
}

export function validateRelationTargets(
  record: EntityDefinitionRecord,
  availableEntityNames: ReadonlySet<string>,
): void {
  for (const field of record.fields) {
    if (field.type !== "relation" || !field.relation) {
      continue;
    }
    if (!availableEntityNames.has(field.relation.target)) {
      throw new DynamicEntityError(
        `Relation target "${field.relation.target}" does not exist for field "${field.name}".`,
      );
    }
  }
}

export function assertDynamicNameAvailable(name: string): void {
  if (getEntity(name)) {
    throw new DynamicEntityError(
      `Entity name "${name}" is reserved by a static entity.`,
    );
  }
}

export function validateDefinitionEvolution(
  current: EntityDefinitionRecord,
  next: EntityDefinitionRecord,
): void {
  if (current.name !== next.name) {
    throw new DynamicEntityError("Entity name cannot be changed.");
  }

  const currentFields = new Map(
    current.fields.map((field) => [field.name, field]),
  );

  for (const field of next.fields) {
    const existing = currentFields.get(field.name);
    if (!existing) {
      continue;
    }
    if (existing.type !== field.type) {
      throw new DynamicEntityError(
        `Field "${field.name}" type cannot be changed.`,
      );
    }
    if (existing.required && !field.required) {
      throw new DynamicEntityError(
        `Field "${field.name}" cannot be changed from required to optional.`,
      );
    }
  }

  for (const [fieldName] of currentFields) {
    if (!next.fields.some((field) => field.name === fieldName)) {
      throw new DynamicEntityError(
        `Field "${fieldName}" cannot be removed. Deprecate via UI metadata instead.`,
      );
    }
  }
}

export function getAvailableEntityNamesForTenant(
  tenantId: string,
  dynamicNames: readonly string[],
): Set<string> {
  const names = new Set<string>();
  for (const entity of getAllEntities()) {
    names.add(entity.name);
  }
  for (const name of dynamicNames) {
    names.add(name);
  }
  void tenantId;
  return names;
}
