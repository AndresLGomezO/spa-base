import {
  defineEntity,
  extendEntitySchemaWithSearchMirrors,
  getAllEntities,
  getEntity,
  createDefaultFormLayout,
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
  const req = field.required ? { required: true as const } : {};
  const sens =
    field.sensitive &&
    field.type !== "relation" &&
    field.type !== "image" &&
    field.type !== "document"
      ? { sensitive: true as const }
      : {};
  const arr = field.isArray ? { isArray: true as const } : {};

  switch (field.type) {
    case "string":
      return { type: "string", ...req, ...sens, ...arr };
    case "number":
      return {
        type: "number",
        ...req,
        ...sens,
        ...arr,
        ...(field.numberKind ? { numberKind: field.numberKind } : {}),
      };
    case "boolean":
      return { type: "boolean", ...req, ...sens, ...arr };
    case "date":
      return { type: "date", ...req, ...sens, ...arr };
    case "enum":
      return {
        type: "enum",
        enumValues: field.enumValues ?? [],
        ...req,
        ...sens,
        ...arr,
      };
    case "image":
      return {
        type: "image",
        ...req,
        ...(field.maxSizeBytes !== undefined
          ? { maxSizeBytes: field.maxSizeBytes }
          : {}),
        ...(field.defaultImage ? { defaultImage: field.defaultImage } : {}),
      };
    case "document":
      return {
        type: "document",
        ...req,
        ...(field.maxSizeBytes !== undefined
          ? { maxSizeBytes: field.maxSizeBytes }
          : {}),
      };
    case "relation":
      return {
        type: "relation",
        ...req,
        relation: {
          target: field.relation!.target,
          type: field.relation!.type,
          onDelete: field.relation!.onDelete ?? "restrict",
        },
      };
    default:
      throw new DynamicEntityError(`Unsupported field type: ${field.type}`);
  }
}

function defaultFileFieldUiFlags(
  field: Pick<FieldDefinitionRecord, "type" | "isArray" | "sensitive">,
): Pick<
  NonNullable<FieldDefinitionRecord["ui"]>,
  "filterable" | "sortable" | "searchable"
> {
  if (field.type === "image" || field.type === "document") {
    return { filterable: false, sortable: false, searchable: false };
  }
  if (field.isArray === true) {
    return {
      filterable: true,
      sortable: false,
      searchable:
        (field.type === "string" || field.type === "enum") &&
        field.sensitive !== true,
    };
  }
  return {};
}

function componentForFieldType(
  type: FieldDefinitionRecord["type"],
): FieldComponentType {
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
    case "image":
      return "image" as const;
    case "document":
      return "document" as const;
    default:
      return "input" as const;
  }
}

export type FieldInputForDefaultUi = Pick<
  FieldDefinitionRecord,
  "name" | "type" | "sensitive" | "isArray"
> & {
  readonly ui?: FieldDefinitionRecord["ui"];
};

export function buildDefaultUiForNewDefinition(input: {
  readonly label: string;
  readonly fields: ReadonlyArray<FieldInputForDefaultUi>;
  readonly navIcon?: string;
}): EntityUIConfig {
  const fieldNames = input.fields.map((field) => field.name);
  const trimmedIcon = input.navIcon?.trim();

  return {
    nav: {
      label: input.label,
      ...(trimmedIcon ? { icon: trimmedIcon } : {}),
    },
    views: [
      {
        type: "table",
        name: "default",
        fields: fieldNames,
      },
    ],
    forms: {
      create: {
        layout: createDefaultFormLayout(fieldNames),
      },
      edit: {
        layout: createDefaultFormLayout(fieldNames),
      },
    },
    fields: Object.fromEntries(
      input.fields.map((field, index) => {
        const fileUiDefaults = defaultFileFieldUiFlags(field);
        const hasFileDefaults =
          field.type === "image" ||
          field.type === "document" ||
          field.isArray === true;
        return [
          field.name,
          {
            ...(field.ui?.label ? { label: field.ui.label } : {}),
            component:
              (field.ui?.component as FieldComponentType | undefined) ??
              componentForFieldType(field.type),
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
              : hasFileDefaults
                ? { filterable: fileUiDefaults.filterable }
                : {}),
            ...(field.ui?.sortable !== undefined
              ? { sortable: field.ui.sortable }
              : hasFileDefaults
                ? { sortable: fileUiDefaults.sortable }
                : {}),
            ...(field.ui?.searchable !== undefined
              ? { searchable: field.ui.searchable }
              : hasFileDefaults
                ? { searchable: fileUiDefaults.searchable }
                : field.type === "string" && field.sensitive !== true
                  ? { searchable: true }
                  : {}),
            order: field.ui?.order ?? index,
          },
        ];
      }),
    ) as EntityUIConfig["fields"],
  };
}

function buildUiFromRecord(
  record: EntityDefinitionRecord,
): EntityUIConfig | undefined {
  if (record.ui) {
    return record.ui;
  }

  return buildDefaultUiForNewDefinition({
    label: record.label,
    fields: record.fields,
  });
}

export function defineEntityFromRecord(
  record: EntityDefinitionRecord,
): DefinedEntity<string, FieldDefinitions> {
  const fields = Object.fromEntries(
    record.fields.map((field) => [field.name, fieldRecordToConfig(field)]),
  ) as FieldDefinitions;

  const ui = buildUiFromRecord(record);

  const entity = defineEntity({
    name: record.name,
    fields,
    ...(ui ? { ui } : {}),
    ...(record.tenantWideRead ? { tenantWideRead: true } : {}),
    ...(record.inMemoryListQueries ? { inMemoryListQueries: true } : {}),
    ...(record.hiddenFromNav ? { hiddenFromNav: true } : {}),
    ...(record.navCategoryId ? { navCategoryId: record.navCategoryId } : {}),
    ...(record.navOrder !== undefined ? { navOrder: record.navOrder } : {}),
    ...(record.displayField ? { displayField: record.displayField } : {}),
    ...(record.description?.trim()
      ? { description: record.description.trim() }
      : {}),
  } as Parameters<typeof defineEntity>[0]) as DefinedEntity<
    string,
    FieldDefinitions
  >;

  return extendEntitySchemaWithSearchMirrors(entity);
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
    if (Boolean(existing.isArray) !== Boolean(field.isArray)) {
      throw new DynamicEntityError(
        `Field "${field.name}" array setting cannot be changed.`,
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
