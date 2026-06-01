import type {
  EntityUIConfig,
  FieldComponentType,
  FieldUIConfig,
  FormLayout,
} from "@repo/entities";

import {
  buildDefaultUiForNewDefinition,
  type FieldInputForDefaultUi,
} from "./define-entity-from-record.js";

function appendMissingFieldNames(
  layoutFields: readonly string[],
  fieldNames: readonly string[],
): string[] {
  const fieldNameSet = new Set(fieldNames);
  const existing = new Set(
    layoutFields.filter((name) => fieldNameSet.has(name)),
  );
  const missing = fieldNames.filter((name) => !existing.has(name));
  return [...layoutFields.filter((name) => fieldNameSet.has(name)), ...missing];
}

function syncFormLayout(
  layout: FormLayout | undefined,
  fieldNames: readonly string[],
  fallback: FormLayout,
): FormLayout {
  if (!layout || layout.sections.length === 0) {
    return fallback;
  }

  const lastIndex = layout.sections.length - 1;
  return {
    sections: layout.sections.map((section, index) => ({
      ...section,
      fields:
        index === lastIndex
          ? appendMissingFieldNames(section.fields, fieldNames)
          : section.fields.filter((name) => fieldNames.includes(name)),
    })),
  };
}

function mergeFieldUiFromDefinition(
  field: FieldInputForDefaultUi,
  existing?: FieldUIConfig,
  defaults?: FieldUIConfig,
): FieldUIConfig {
  const base = {
    ...(defaults ?? {}),
    ...(existing ?? {}),
  };

  return {
    ...base,
    ...(field.ui?.label ? { label: field.ui.label } : {}),
    ...(field.ui?.component
      ? { component: field.ui.component as FieldComponentType }
      : {}),
    ...(field.ui?.placeholder ? { placeholder: field.ui.placeholder } : {}),
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
    ...(field.ui?.searchable !== undefined
      ? { searchable: field.ui.searchable }
      : {}),
    ...(field.ui?.order !== undefined ? { order: field.ui.order } : {}),
  };
}

export function syncEntityDefinitionUiWithFields(input: {
  readonly ui: EntityUIConfig;
  readonly label: string;
  readonly fields: ReadonlyArray<FieldInputForDefaultUi>;
}): EntityUIConfig {
  const fieldNames = input.fields.map((field) => field.name);
  const defaults = buildDefaultUiForNewDefinition({
    label: input.label,
    fields: input.fields,
  });

  const syncedFields: Record<string, FieldUIConfig> = {
    ...(input.ui.fields ?? {}),
  };

  for (const field of input.fields) {
    const defaultFieldUi = defaults.fields?.[field.name];
    syncedFields[field.name] = mergeFieldUiFromDefinition(
      field,
      syncedFields[field.name],
      defaultFieldUi,
    );
  }

  const syncedViews = (input.ui.views ?? defaults.views ?? []).map(
    (view, index) => {
      if (view.type !== "table" || index !== 0) {
        return view;
      }

      return {
        ...view,
        fields: appendMissingFieldNames(view.fields ?? [], fieldNames),
      };
    },
  );

  return {
    ...input.ui,
    fields: syncedFields,
    views: syncedViews,
    forms: {
      create: syncFormLayout(
        input.ui.forms?.create,
        fieldNames,
        defaults.forms!.create,
      ),
      edit: syncFormLayout(
        input.ui.forms?.edit,
        fieldNames,
        defaults.forms!.edit,
      ),
    },
  };
}
