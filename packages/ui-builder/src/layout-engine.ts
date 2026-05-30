import type { FieldUIConfig, FormLayout } from "@repo/entities";

import { sortFieldsByUiOrder } from "./sort-fields-by-order.js";

export function getFormSections(
  layout: FormLayout,
  fieldUi?: Readonly<Record<string, FieldUIConfig>>,
) {
  return layout.sections.map((section) => ({
    ...section,
    fields: sortFieldsByUiOrder(section.fields, fieldUi),
  }));
}
