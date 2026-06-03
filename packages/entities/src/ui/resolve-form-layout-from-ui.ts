import { collectLayoutFieldPaths } from "@repo/ui-builder-core";

import type { FormLayout, SerializableEntityDefinition } from "./types.js";

/** @deprecated Prefer designed `forms.*.layout`; kept for migration shims. */
export function resolveCreateFormFromLayout(
  definition: SerializableEntityDefinition,
): FormLayout {
  const layout = definition.ui.forms.create.layout;
  if (layout) {
    const fields = collectLayoutFieldPaths(layout);
    return {
      sections: [{ fields: fields.length > 0 ? fields : ["id"] }],
      layout,
    };
  }
  return definition.ui.forms.create;
}

export function resolveEditFormFromUi(
  definition: SerializableEntityDefinition,
): FormLayout {
  const layout = definition.ui.forms.edit.layout;
  if (layout) {
    const fields = collectLayoutFieldPaths(layout);
    return {
      sections: [{ fields: fields.length > 0 ? fields : ["id"] }],
      layout,
    };
  }
  return definition.ui.forms.edit;
}
