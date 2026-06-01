import type { FormLayout } from "@repo/entities";

export function augmentFormLayoutWithFieldNames(
  layout: FormLayout,
  fieldNames: readonly string[],
): FormLayout {
  const layoutFieldNames = layout.sections.flatMap((section) => section.fields);
  const missing = fieldNames.filter(
    (fieldName) => !layoutFieldNames.includes(fieldName),
  );

  if (missing.length === 0) {
    return layout;
  }

  if (layout.sections.length === 0) {
    return { sections: [{ fields: [...missing] }] };
  }

  const lastIndex = layout.sections.length - 1;
  return {
    sections: layout.sections.map((section, index) =>
      index === lastIndex
        ? { ...section, fields: [...section.fields, ...missing] }
        : section,
    ),
  };
}
