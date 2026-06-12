import {
  createDefaultFormLayout,
  findLayoutComponent,
  RESPONSIVE_BREAKPOINT_ORDER,
  type ResponsiveGridBreakpoint,
  type UiComponentKind,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type {
  EntityUiOverrideForms,
  FormModalChrome,
  FormModalContentPadding,
  FormPresentation,
  WizardFormConfig,
} from "./form-config.js";
import type {
  FormModalSize,
  FormModalSizeByBreakpoint,
  SerializableEntityDefinition,
} from "./types.js";
import { readLegacyFormSectionFields } from "./sync-form-layout.js";

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

export type FormModalPreviewBreakpoint = ResponsiveGridBreakpoint | "full";

export function resolveFormModalSizeEditBreakpoint(
  previewBreakpoint: FormModalPreviewBreakpoint,
): ResponsiveGridBreakpoint {
  return previewBreakpoint === "full" ? "xl" : previewBreakpoint;
}

export function resolveFormModalSizes(
  forms: Pick<EntityUiOverrideForms, "modalSize" | "modalSizeByBreakpoint">,
): Record<ResponsiveGridBreakpoint, FormModalSize> {
  const explicit = forms.modalSizeByBreakpoint ?? {};
  const anchor =
    forms.modalSize && FORM_MODAL_SIZES.has(forms.modalSize)
      ? forms.modalSize
      : "lg";

  const xl =
    explicit.xl && FORM_MODAL_SIZES.has(explicit.xl) ? explicit.xl : anchor;
  const lg =
    explicit.lg && FORM_MODAL_SIZES.has(explicit.lg) ? explicit.lg : xl;
  const md =
    explicit.md && FORM_MODAL_SIZES.has(explicit.md) ? explicit.md : lg;
  const sm =
    explicit.sm && FORM_MODAL_SIZES.has(explicit.sm) ? explicit.sm : md;
  const base =
    explicit.base && FORM_MODAL_SIZES.has(explicit.base) ? explicit.base : sm;

  return { base, sm, md, lg, xl };
}

export function resolveFormModalSizeAtBreakpoint(
  forms: Pick<EntityUiOverrideForms, "modalSize" | "modalSizeByBreakpoint">,
  breakpoint: ResponsiveGridBreakpoint,
): FormModalSize {
  return resolveFormModalSizes(forms)[breakpoint];
}

export function resolveFormModalSizeForPreviewBreakpoint(
  forms: Pick<EntityUiOverrideForms, "modalSize" | "modalSizeByBreakpoint">,
  previewBreakpoint: FormModalPreviewBreakpoint,
): FormModalSize {
  return resolveFormModalSizeAtBreakpoint(
    forms,
    resolveFormModalSizeEditBreakpoint(previewBreakpoint),
  );
}

export type EntityFormModalSizing =
  | { readonly mode: "simulated"; readonly size: FormModalSize }
  | {
      readonly mode: "responsive";
      readonly responsiveSizes: Record<ResponsiveGridBreakpoint, FormModalSize>;
    };

export function resolveEntityFormModalSizing(
  forms: Pick<EntityUiOverrideForms, "modalSize" | "modalSizeByBreakpoint">,
  options?: {
    readonly simulatedBreakpoint?: FormModalPreviewBreakpoint;
  },
): EntityFormModalSizing {
  if (options?.simulatedBreakpoint) {
    return {
      mode: "simulated",
      size: resolveFormModalSizeForPreviewBreakpoint(
        forms,
        options.simulatedBreakpoint,
      ),
    };
  }

  return {
    mode: "responsive",
    responsiveSizes: resolveFormModalSizes(forms),
  };
}

export function resolveFormModalSize(
  definition: SerializableEntityDefinition,
): FormModalSize {
  return resolveFormModalSizes(definition.ui.forms).xl;
}

export function resolveFormModalSizeByBreakpointFromDefinition(
  definition: SerializableEntityDefinition,
): FormModalSizeByBreakpoint {
  return definition.ui.forms.modalSizeByBreakpoint ?? {};
}

export function isFormModalSizeExplicitAtBreakpoint(
  forms: Pick<EntityUiOverrideForms, "modalSize" | "modalSizeByBreakpoint">,
  previewBreakpoint: FormModalPreviewBreakpoint,
): boolean {
  const breakpoint = resolveFormModalSizeEditBreakpoint(previewBreakpoint);
  if (breakpoint === "xl") {
    return false;
  }
  return forms.modalSizeByBreakpoint?.[breakpoint] !== undefined;
}

export function resolveFormModalSizeInheritanceSource(
  forms: Pick<EntityUiOverrideForms, "modalSize" | "modalSizeByBreakpoint">,
  previewBreakpoint: FormModalPreviewBreakpoint,
): ResponsiveGridBreakpoint | null {
  const breakpoint = resolveFormModalSizeEditBreakpoint(previewBreakpoint);
  if (
    breakpoint === "xl" ||
    forms.modalSizeByBreakpoint?.[breakpoint] !== undefined
  ) {
    return null;
  }

  const index = RESPONSIVE_BREAKPOINT_ORDER.indexOf(breakpoint);
  for (
    let candidateIndex = index + 1;
    candidateIndex < RESPONSIVE_BREAKPOINT_ORDER.length;
    candidateIndex += 1
  ) {
    const candidate = RESPONSIVE_BREAKPOINT_ORDER[candidateIndex];
    if (
      candidate &&
      (candidate === "xl" ||
        forms.modalSizeByBreakpoint?.[candidate] !== undefined)
    ) {
      return candidate;
    }
  }

  return "xl";
}

export function serializeFormModalSizeByBreakpoint(
  modalSize: FormModalSize,
  overrides: FormModalSizeByBreakpoint,
): FormModalSizeByBreakpoint | undefined {
  const persisted: FormModalSizeByBreakpoint = {};

  for (const breakpoint of RESPONSIVE_BREAKPOINT_ORDER) {
    if (breakpoint === "xl") {
      continue;
    }
    if (overrides[breakpoint] === undefined) {
      continue;
    }
    const withoutThis = resolveFormModalSizes({
      modalSize,
      modalSizeByBreakpoint: {
        ...overrides,
        [breakpoint]: undefined,
      },
    });
    const resolved = resolveFormModalSizes({
      modalSize,
      modalSizeByBreakpoint: overrides,
    });
    if (resolved[breakpoint] !== withoutThis[breakpoint]) {
      persisted[breakpoint] = overrides[breakpoint];
    }
  }

  if (overrides.xl !== undefined) {
    const withoutXl = resolveFormModalSizes({
      modalSize,
      modalSizeByBreakpoint: {
        ...overrides,
        xl: undefined,
      },
    });
    const resolved = resolveFormModalSizes({
      modalSize,
      modalSizeByBreakpoint: overrides,
    });
    if (resolved.xl !== withoutXl.xl) {
      persisted.xl = overrides.xl;
    }
  }

  return Object.keys(persisted).length > 0 ? persisted : undefined;
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
): UiLayoutDocument | undefined {
  const forms = definition.ui.forms;
  return forms.create.layout ?? forms.edit.layout ?? undefined;
}

function getEditableFieldNames(
  definition: SerializableEntityDefinition,
): readonly string[] {
  return Object.keys(definition.fields).filter((fieldName) => {
    if (definition.fields[fieldName]?.type === "document") {
      return false;
    }
    return true;
  });
}

function upgradeLegacyFormLayout(
  definition: SerializableEntityDefinition,
): UiLayoutDocument {
  const createForm = definition.ui.forms.create;
  if (createForm.layout) {
    return createForm.layout;
  }

  const sectionFields = readLegacyFormSectionFields(createForm);
  if (sectionFields.length > 0) {
    return createDefaultFormLayout(sectionFields);
  }

  const editableFields = getEditableFieldNames(definition);
  return createDefaultFormLayout(
    editableFields.length > 0 ? editableFields : ["id"],
  );
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
): UiLayoutDocument {
  const layout = sharedPlainLayout(definition);
  if (layout) {
    return layout;
  }

  return upgradeLegacyFormLayout(definition);
}

export function resolveWizardForm(
  definition: SerializableEntityDefinition,
): WizardFormConfig | undefined {
  return definition.ui.forms.wizard;
}

/** @deprecated Use resolvePlainFormLayout */
export function resolveCreateFormFromLayout(
  definition: SerializableEntityDefinition,
): UiLayoutDocument {
  return resolvePlainFormLayout(definition);
}

/** @deprecated Use resolvePlainFormLayout */
export function resolveEditFormFromUi(
  definition: SerializableEntityDefinition,
): UiLayoutDocument {
  return resolvePlainFormLayout(definition);
}

export type { FormModalChrome, FormModalContentPadding };
