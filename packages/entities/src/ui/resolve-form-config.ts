import {
  collectLayoutFieldPaths,
  findLayoutComponent,
  type UiComponentKind,
} from "@repo/ui-builder-core";

import type {
  FormModalChrome,
  FormModalContentPadding,
  FormPresentation,
  WizardFormConfig,
} from "./form-config.js";
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

export interface ResolvedFormModalChrome {
  readonly showHeader: boolean;
  readonly contentPadding: FormModalContentPadding;
}

export function resolveFormModalSize(
  definition: SerializableEntityDefinition,
): FormModalSize {
  const size = definition.ui.forms.modalSize;
  if (size && FORM_MODAL_SIZES.has(size)) {
    return size;
  }
  return "lg";
}

export function resolveFormModalChrome(
  definition: SerializableEntityDefinition,
): ResolvedFormModalChrome {
  const chrome = definition.ui.forms.modalChrome;
  return {
    showHeader: chrome?.showHeader ?? true,
    contentPadding: chrome?.contentPadding ?? "default",
  };
}

/** Applies modal chrome rules for runtime padding (hidden header implies flush body). */
export function resolveEffectiveFormModalContentPadding(
  chrome: FormModalChrome | ResolvedFormModalChrome,
): FormModalContentPadding {
  if (chrome.contentPadding === "none" || chrome.showHeader === false) {
    return "none";
  }
  return "default";
}

export function resolveFormModalFooterLayout(
  definition: SerializableEntityDefinition,
): import("@repo/ui-builder-core").UiLayoutDocument | undefined {
  return definition.ui.forms.modalFooterLayout;
}

export function resolveFormUsesModalBuilderFooter(
  definition: SerializableEntityDefinition,
): boolean {
  return (
    definition.ui.forms.modalFooterLayout != null ||
    definition.ui.forms.modalChrome != null
  );
}

export function resolveFormModalActionComponentKind(
  definition: SerializableEntityDefinition,
): Extract<UiComponentKind, "form-actions" | "wizard-actions"> {
  return resolveFormPresentation(definition) === "wizard"
    ? "wizard-actions"
    : "form-actions";
}

function sharedPlainLayout(
  definition: SerializableEntityDefinition,
): import("@repo/ui-builder-core").UiLayoutDocument | undefined {
  const forms = definition.ui.forms;
  return forms.create.layout ?? forms.edit.layout ?? undefined;
}

export function resolveFormModalActionLayout(
  definition: SerializableEntityDefinition,
): import("@repo/ui-builder-core").UiLayoutDocument | undefined {
  const footerLayout = resolveFormModalFooterLayout(definition);
  if (footerLayout) {
    return footerLayout;
  }

  const presentation = resolveFormPresentation(definition);
  if (presentation === "wizard") {
    return definition.ui.forms.wizard?.shellLayout;
  }

  return sharedPlainLayout(definition);
}

export function resolveFormModalHasLayoutActions(
  definition: SerializableEntityDefinition,
): boolean {
  const actionLayout = resolveFormModalActionLayout(definition);
  if (!actionLayout) {
    return false;
  }

  const kind = resolveFormModalActionComponentKind(definition);
  return findLayoutComponent(actionLayout, kind) != null;
}

export function resolveFormPresentation(
  definition: SerializableEntityDefinition,
): FormPresentation {
  const explicit = definition.ui.forms.presentation;
  if (explicit === "plain" || explicit === "wizard") {
    return explicit;
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

export type { FormModalChrome, FormModalContentPadding };
