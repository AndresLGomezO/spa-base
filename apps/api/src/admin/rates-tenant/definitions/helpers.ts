import type { CreateEntityDefinitionInput } from "@repo/dynamic-entities";
import type { FieldDefinitionRecord } from "@repo/dynamic-entities";

import type { EntityUIConfig, FieldComponentType } from "@repo/entities";

import { resolveRatesListFieldUi } from "./field-ui-policy.js";

type FieldInput = FieldDefinitionRecord;

export function stringField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
  },
): FieldInput {
  return {
    name,
    type: "string",
    ...(options?.required ? { required: true } : {}),
    ...(options?.label || options?.order !== undefined
      ? {
          ui: {
            ...(options.label ? { label: options.label } : {}),
            ...(options.order !== undefined ? { order: options.order } : {}),
          },
        }
      : {}),
  };
}

export function decimalField(
  name: string,
  options: {
    readonly required?: boolean;
    readonly sensitive?: boolean;
    readonly displayFormat?: "currency" | "percentage" | "plain";
    readonly label?: string;
    readonly order?: number;
  } = {},
): FieldInput {
  return {
    name,
    type: "number",
    numberKind: "decimal",
    ...(options.required ? { required: true } : {}),
    ...(options.sensitive ? { sensitive: true } : {}),
    ui: {
      ...(options.label ? { label: options.label } : {}),
      ...(options.displayFormat
        ? { displayFormat: options.displayFormat }
        : {}),
      ...(options.order !== undefined ? { order: options.order } : {}),
      component: "number",
    },
  };
}

export function integerField(
  name: string,
  options?: { readonly required?: boolean; readonly label?: string },
): FieldInput {
  return {
    name,
    type: "number",
    numberKind: "integer",
    ...(options?.required ? { required: true } : {}),
    ui: {
      ...(options?.label ? { label: options.label } : {}),
      component: "number",
      displayFormat: "plain",
    },
  };
}

export function booleanField(
  name: string,
  options?: { readonly required?: boolean; readonly label?: string },
): FieldInput {
  return {
    name,
    type: "boolean",
    ...(options?.required ? { required: true } : {}),
    ...(options?.label
      ? { ui: { label: options.label, component: "toggle" } }
      : {}),
  };
}

export function dateField(
  name: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly dateDisplayFormat?: "date" | "datetime";
  },
): FieldInput {
  return {
    name,
    type: "date",
    ...(options?.required ? { required: true } : {}),
    ui: {
      ...(options?.label ? { label: options.label } : {}),
      component: "date",
      dateDisplayFormat: options?.dateDisplayFormat ?? "date",
    },
  };
}

export function relationField(
  name: string,
  target: string,
  options?: {
    readonly required?: boolean;
    readonly label?: string;
    readonly order?: number;
  },
): FieldInput {
  return {
    name,
    type: "relation",
    relation: { target, type: "many-to-one", onDelete: "restrict" },
    ...(options?.required ? { required: true } : {}),
    ...(options?.label || options?.order !== undefined
      ? {
          ui: {
            ...(options.label ? { label: options.label } : {}),
            ...(options.order !== undefined ? { order: options.order } : {}),
            component: "relation",
          },
        }
      : {}),
  };
}

export function lookupDefinition(input: {
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
    fields: [...input.fields],
    hiddenFromNav: true,
    tenantWideRead: true,
    navCategoryId: input.navCategoryId,
    navOrder: input.navOrder,
    displayField: input.displayField ?? "code",
    ui: buildDefinitionUi(input.name, input.label, input.icon, input.fields),
  };
}

function buildDefinitionUi(
  entityName: string,
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
      fields.map((field, index) => {
        const listUi = resolveRatesListFieldUi(entityName, field);
        return [
          field.name,
          {
            label: field.ui?.label ?? field.name,
            component:
              (field.ui?.component as FieldComponentType | undefined) ??
              (field.type === "number"
                ? "number"
                : field.type === "boolean"
                  ? "toggle"
                  : field.type === "date"
                    ? "date"
                    : field.type === "relation"
                      ? "relation"
                      : "input"),
            ...(field.ui?.displayFormat
              ? { displayFormat: field.ui.displayFormat }
              : {}),
            ...(field.ui?.dateDisplayFormat
              ? { dateDisplayFormat: field.ui.dateDisplayFormat }
              : {}),
            ...(field.ui?.placeholder
              ? { placeholder: field.ui.placeholder }
              : {}),
            filterable: field.ui?.filterable ?? listUi.filterable,
            sortable: field.ui?.sortable ?? listUi.sortable,
            searchable: field.ui?.searchable ?? listUi.searchable,
            order: field.ui?.order ?? index,
          },
        ];
      }),
    ),
  };
}

export function visibleDefinition(input: {
  readonly name: string;
  readonly label: string;
  readonly navCategoryId: string;
  readonly navOrder: number;
  readonly icon: string;
  readonly fields: readonly FieldInput[];
  readonly displayField?: string;
  readonly tenantWideRead?: boolean;
}): CreateEntityDefinitionInput {
  return {
    name: input.name,
    label: input.label,
    fields: [...input.fields],
    navCategoryId: input.navCategoryId,
    navOrder: input.navOrder,
    displayField: input.displayField ?? "name",
    ...(input.tenantWideRead ? { tenantWideRead: true } : {}),
    ui: buildDefinitionUi(input.name, input.label, input.icon, input.fields),
  };
}
