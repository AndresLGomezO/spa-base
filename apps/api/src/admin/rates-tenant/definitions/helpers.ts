import type { CreateEntityDefinitionInput } from "@repo/dynamic-entities";
import type { FieldDefinitionRecord } from "@repo/dynamic-entities";

import type {
  EntityFileReference,
  EntityUIConfig,
  FieldComponentType,
} from "@repo/entities";

export const CURRENCY_ENUM_VALUES = ["COP", "USD"] as const;

type FieldInput = FieldDefinitionRecord;

interface FieldUiFlags {
  readonly filterable?: boolean;
  readonly sortable?: boolean;
  readonly searchable?: boolean;
}

function withUi(
  field: FieldInput,
  ui: FieldInput["ui"] & FieldUiFlags,
): FieldInput {
  return { ...field, ui: { ...field.ui, ...ui } };
}

export function stringArrayField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly filterable?: boolean;
    readonly searchable?: boolean;
  },
): FieldInput {
  const field: FieldInput = {
    name,
    type: "string",
    isArray: true,
    ...(options?.required ? { required: true } : {}),
  };
  if (
    options?.label ||
    options?.order !== undefined ||
    options?.filterable !== undefined ||
    options?.searchable !== undefined
  ) {
    return withUi(field, {
      ...(options.label ? { label: options.label } : {}),
      ...(options.order !== undefined ? { order: options.order } : {}),
      filterable: options?.filterable ?? true,
      sortable: false,
      searchable: options?.searchable ?? true,
    });
  }
  return withUi(field, {
    filterable: true,
    sortable: false,
    searchable: true,
  });
}

export function stringField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly filterable?: boolean;
    readonly sortable?: boolean;
    readonly searchable?: boolean;
  },
): FieldInput {
  const field: FieldInput = {
    name,
    type: "string",
    ...(options?.required ? { required: true } : {}),
  };
  if (
    options?.label ||
    options?.order !== undefined ||
    options?.filterable !== undefined ||
    options?.sortable !== undefined ||
    options?.searchable !== undefined
  ) {
    return withUi(field, {
      ...(options.label ? { label: options.label } : {}),
      ...(options.order !== undefined ? { order: options.order } : {}),
      ...(options.filterable !== undefined
        ? { filterable: options.filterable }
        : {}),
      ...(options.sortable !== undefined ? { sortable: options.sortable } : {}),
      ...(options.searchable !== undefined
        ? { searchable: options.searchable }
        : {}),
    });
  }
  return field;
}

export function enumField(
  name: string,
  enumValues: readonly string[],
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly filterable?: boolean;
    readonly sortable?: boolean;
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "enum",
      enumValues: [...enumValues],
      ...(options?.required ? { required: true } : {}),
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "select",
      ...(options?.filterable !== undefined
        ? { filterable: options.filterable }
        : {}),
      ...(options?.sortable !== undefined
        ? { sortable: options.sortable }
        : {}),
    },
  );
}

export function decimalField(
  name: string,
  options: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly displayFormat?: "currency" | "percentage" | "plain";
    readonly sortable?: boolean;
  } = {},
): FieldInput {
  return withUi(
    {
      name,
      type: "number",
      numberKind: "decimal",
      ...(options.required ? { required: true } : {}),
    },
    {
      ...(options.label ? { label: options.label } : {}),
      ...(options.order !== undefined ? { order: options.order } : {}),
      ...(options.displayFormat
        ? { displayFormat: options.displayFormat }
        : {}),
      component: "number",
      filterable: false,
      ...(options.sortable !== undefined ? { sortable: options.sortable } : {}),
    },
  );
}

export function integerField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly sortable?: boolean;
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "number",
      numberKind: "integer",
      ...(options?.required ? { required: true } : {}),
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "number",
      displayFormat: "plain",
      filterable: false,
      ...(options?.sortable !== undefined
        ? { sortable: options.sortable }
        : {}),
    },
  );
}

export function booleanField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly filterable?: boolean;
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "boolean",
      ...(options?.required ? { required: true } : {}),
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "toggle",
      sortable: false,
      ...(options?.filterable !== undefined
        ? { filterable: options.filterable }
        : {}),
    },
  );
}

function dateField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly sortable?: boolean;
    readonly dateDisplayFormat?: "date" | "datetime";
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "date",
      ...(options?.required ? { required: true } : {}),
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "date",
      dateDisplayFormat: options?.dateDisplayFormat ?? "datetime",
      filterable: false,
      ...(options?.sortable !== undefined
        ? { sortable: options.sortable }
        : {}),
    },
  );
}

export function dateOnlyField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly sortable?: boolean;
  },
): FieldInput {
  return dateField(name, { ...options, dateDisplayFormat: "date" });
}

export function imageField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly maxSizeBytes?: number;
    readonly defaultImage?: EntityFileReference;
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "image",
      ...(options?.required ? { required: true } : {}),
      ...(options?.maxSizeBytes !== undefined
        ? { maxSizeBytes: options.maxSizeBytes }
        : {}),
      ...(options?.defaultImage ? { defaultImage: options.defaultImage } : {}),
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "image",
    },
  );
}

export function documentField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly maxSizeBytes?: number;
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "document",
      ...(options?.required ? { required: true } : {}),
      ...(options?.maxSizeBytes !== undefined
        ? { maxSizeBytes: options.maxSizeBytes }
        : {}),
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "document",
    },
  );
}

export function relationField(
  name: string,
  target: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
    readonly filterable?: boolean;
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "relation",
      relation: { target, type: "many-to-one", onDelete: "restrict" },
      ...(options?.required ? { required: true } : {}),
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "relation",
      sortable: false,
      ...(options?.filterable !== undefined
        ? { filterable: options.filterable }
        : {}),
    },
  );
}

export function manyToManyRelationField(
  name: string,
  target: string,
  options?: {
    readonly label?: string;
    readonly order?: number;
  },
): FieldInput {
  return withUi(
    {
      name,
      type: "relation",
      relation: { target, type: "many-to-many" },
    },
    {
      ...(options?.label ? { label: options.label } : {}),
      ...(options?.order !== undefined ? { order: options.order } : {}),
      component: "relation",
      filterable: false,
      sortable: false,
    },
  );
}

function defaultComponentForFieldType(field: FieldInput): FieldComponentType {
  if (field.ui?.component) {
    return field.ui.component as FieldComponentType;
  }
  switch (field.type) {
    case "number":
      return "number";
    case "boolean":
      return "toggle";
    case "date":
      return "date";
    case "relation":
      return "relation";
    case "enum":
      return "select";
    case "image":
      return "image";
    case "document":
      return "document";
    default:
      return "input";
  }
}

function buildDefinitionUi(
  label: string,
  icon: string,
  fields: readonly FieldInput[],
): EntityUIConfig {
  const fieldNames = fields.map((field) => field.name);
  return {
    nav: { label, icon },
    views: [{ type: "table", name: "default", fields: [...fieldNames] }],
    forms: {
      create: { sections: [{ fields: [...fieldNames] }] },
      edit: { sections: [{ fields: [...fieldNames] }] },
    },
    fields: Object.fromEntries(
      fields.map((field, index) => [
        field.name,
        {
          label: field.ui?.label ?? field.name,
          component:
            (field.ui?.component as FieldComponentType | undefined) ??
            defaultComponentForFieldType(field),
          ...(field.ui?.displayFormat
            ? { displayFormat: field.ui.displayFormat }
            : {}),
          ...(field.ui?.dateDisplayFormat
            ? { dateDisplayFormat: field.ui.dateDisplayFormat }
            : {}),
          filterable: field.ui?.filterable ?? false,
          sortable: field.ui?.sortable ?? false,
          searchable: field.ui?.searchable ?? false,
          order: field.ui?.order ?? index,
        },
      ]),
    ),
  };
}

export function uncategorizedDefinition(input: {
  readonly name: string;
  readonly label: string;
  readonly navOrder: number;
  readonly icon: string;
  readonly fields: readonly FieldInput[];
  readonly displayField?: string;
}): CreateEntityDefinitionInput {
  return {
    name: input.name,
    label: input.label,
    navOrder: input.navOrder,
    displayField: input.displayField ?? "name",
    fields: [...input.fields],
    ui: buildDefinitionUi(input.label, input.icon, input.fields),
  };
}

export function groupedDefinition(input: {
  readonly name: string;
  readonly label: string;
  readonly navCategoryId: string;
  readonly navOrder: number;
  readonly icon: string;
  readonly fields: readonly FieldInput[];
  readonly displayField?: string;
}): CreateEntityDefinitionInput {
  return {
    name: input.name,
    label: input.label,
    navCategoryId: input.navCategoryId,
    navOrder: input.navOrder,
    displayField: input.displayField ?? "name",
    fields: [...input.fields],
    ui: buildDefinitionUi(input.label, input.icon, input.fields),
  };
}
