import { collectLayoutFieldPaths } from "@repo/ui-builder-core";

import type { FormPresentation, WizardFormConfig } from "./form-config.js";
import type {
  FormLayout,
  FormModalSize,
  SerializableEntityDefinition,
} from "./types.js";

const FORM_MODAL_SIZES = new Set<FormModalSize>([
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
]);

export function resolveFormModalSize(
  definition: SerializableEntityDefinition,
): FormModalSize {
  const size = definition.ui.forms.modalSize;
  if (size && FORM_MODAL_SIZES.has(size)) {
    return size;
  }
  return "lg";
}

function sharedPlainLayout(
  definition: SerializableEntityDefinition,
): import("@repo/ui-builder-core").UiLayoutDocument | undefined {
  const forms = definition.ui.forms;
  return forms.create.layout ?? forms.edit.layout ?? undefined;
}

export function resolveFormPresentation(
  definition: SerializableEntityDefinition,
): FormPresentation {
  if (definition.ui.forms.presentation === "wizard") {
    return "wizard";
  }
  if (definition.ui.forms.wizard) {
    return "wizard";
  }
  return "plain";
}

export function resolvePlainFormLayout(
  definition: SerializableEntityDefinition,
): FormLayout {
  const layout = sharedPlainLayout(definition);
  if (layout) {
    const fields = collectLayoutFieldPaths(layout);
    return {
      sections: [{ fields: fields.length > 0 ? fields : ["id"] }],
      layout,
    };
  }
  return definition.ui.forms.create;
}

export function resolveWizardForm(
  definition: SerializableEntityDefinition,
): WizardFormConfig | undefined {
  return definition.ui.forms.wizard;
}

/** @deprecated Use resolvePlainFormLayout */
export function resolveCreateFormFromLayout(
  definition: SerializableEntityDefinition,
): FormLayout {
  return resolvePlainFormLayout(definition);
}

/** @deprecated Use resolvePlainFormLayout */
export function resolveEditFormFromUi(
  definition: SerializableEntityDefinition,
): FormLayout {
  return resolvePlainFormLayout(definition);
}
