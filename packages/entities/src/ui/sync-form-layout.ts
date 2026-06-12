import {
  addComponentRowAt,
  collectLayoutFieldPaths,
  createDefaultComponent,
  createDefaultFormLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type { FormLayout, FormSection } from "./types.js";

type LegacyFormLayoutShape = FormLayout & {
  readonly sections?: readonly FormSection[];
};

export function readLegacyFormSectionFields(
  formLayout: FormLayout,
): readonly string[] {
  const legacy = formLayout as LegacyFormLayoutShape;
  const fields: string[] = [];
  const seen = new Set<string>();

  for (const section of legacy.sections ?? []) {
    for (const field of section.fields) {
      if (seen.has(field)) {
        continue;
      }
      seen.add(field);
      fields.push(field);
    }
  }

  return fields;
}

export function syncFormLayoutWithFieldNames(
  formLayout: FormLayout | undefined,
  fieldNames: readonly string[],
  fallbackLayout: UiLayoutDocument,
): FormLayout {
  const legacyFields = formLayout
    ? readLegacyFormSectionFields(formLayout)
    : [];
  const baseLayout =
    formLayout?.layout ??
    (legacyFields.length > 0
      ? createDefaultFormLayout(legacyFields)
      : fallbackLayout);

  const existingRoots = new Set(
    collectLayoutFieldPaths(baseLayout).map(
      (path) => path.split(".")[0] ?? path,
    ),
  );
  const missing = fieldNames.filter((name) => !existingRoots.has(name));

  if (missing.length === 0) {
    return { layout: baseLayout };
  }

  let nextLayout = baseLayout;
  for (const fieldPath of missing) {
    nextLayout = addComponentRowAt(
      nextLayout,
      { scope: "root", columnIndex: 0 },
      createDefaultComponent("form-field", fieldPath),
    );
  }

  return { layout: nextLayout };
}
