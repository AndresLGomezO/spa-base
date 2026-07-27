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
  FormDesignDefinition,
  FormDesignOption,
  FormModalChrome,
  FormModalContentPadding,
  FormPresentation,
  WizardFormConfig,
} from "./form-config.js";
import type {
  FormConfig,
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

function findFormDesignDefinition(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): FormDesignDefinition | undefined {
  if (!formDesignId) {
    return undefined;
  }

  return definition.ui.formDesigns?.find(
    (design) => design.id === formDesignId,
  );
}

function formDesignToFormConfig(
  design: FormDesignDefinition,
  base: FormConfig,
): FormConfig {
  const presentation =
    design.presentation ??
    (design.wizard ? ("wizard" as const) : undefined) ??
    base.presentation;
  const wizard = design.wizard ?? base.wizard;
  const layoutForPlain = presentation === "wizard" ? undefined : design.layout;

  return {
    presentation: presentation ?? (wizard ? "wizard" : "plain"),
    ...(wizard ? { wizard } : {}),
    ...(design.modalSize !== undefined || base.modalSize !== undefined
      ? { modalSize: design.modalSize ?? base.modalSize }
      : {}),
    ...(design.modalSizeByBreakpoint !== undefined ||
    base.modalSizeByBreakpoint !== undefined
      ? {
          modalSizeByBreakpoint:
            design.modalSizeByBreakpoint ?? base.modalSizeByBreakpoint,
        }
      : {}),
    ...(design.modalChrome !== undefined || base.modalChrome !== undefined
      ? { modalChrome: design.modalChrome ?? base.modalChrome }
      : {}),
    ...(design.modalFooterLayout !== undefined ||
    base.modalFooterLayout !== undefined
      ? {
          modalFooterLayout: design.modalFooterLayout ?? base.modalFooterLayout,
        }
      : {}),
    create: layoutForPlain ? { layout: layoutForPlain } : base.create,
    edit: layoutForPlain ? { layout: layoutForPlain } : base.edit,
  };
}

export function resolveFormConfigForDesign(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): FormConfig {
  const design = findFormDesignDefinition(definition, formDesignId);
  if (!design) {
    if (
      formDesignId &&
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      console.warn(
        `[entities] Form design "${formDesignId}" not found on entity "${definition.name}"; using default form.`,
      );
    }
    return definition.ui.forms;
  }

  return formDesignToFormConfig(design, definition.ui.forms);
}

export function resolveFormDesign(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): { readonly formDesignId?: string; readonly forms: FormConfig } {
  const design = findFormDesignDefinition(definition, formDesignId);
  if (!design) {
    return { forms: definition.ui.forms };
  }

  return {
    formDesignId: design.id,
    forms: formDesignToFormConfig(design, definition.ui.forms),
  };
}

export function listFormDesignOptions(
  definition: SerializableEntityDefinition,
): readonly FormDesignOption[] {
  return [
    { id: undefined, label: "Default" },
    ...(definition.ui.formDesigns ?? []).map((design) => ({
      id: design.id,
      label: design.label,
    })),
  ];
}

function resolveExistingFormDesignId(
  definition: SerializableEntityDefinition,
  formDesignId: string | undefined,
): string | undefined {
  if (!formDesignId) {
    return undefined;
  }
  return findFormDesignDefinition(definition, formDesignId)?.id;
}

export function resolveEntityPageCreateFormDesignId(
  definition: SerializableEntityDefinition,
): string | undefined {
  return resolveExistingFormDesignId(
    definition,
    definition.ui.entityPageCreateFormDesignId,
  );
}

export function resolveEntityPageEditFormDesignId(
  definition: SerializableEntityDefinition,
): string | undefined {
  return resolveExistingFormDesignId(
    definition,
    definition.ui.entityPageEditFormDesignId,
  );
}

export interface EntityPageFormDesignSlotSummary {
  readonly formDesignId?: string;
  readonly label: string;
  readonly presentation: FormPresentation;
  readonly missing: boolean;
  readonly isDefault: boolean;
}

export function summarizeEntityPageFormDesignSlot(
  definition: SerializableEntityDefinition,
  storedFormDesignId: string | undefined,
): EntityPageFormDesignSlotSummary {
  if (!storedFormDesignId) {
    return {
      label: "Default",
      presentation: resolveFormPresentation(definition),
      missing: false,
      isDefault: true,
    };
  }

  const design = findFormDesignDefinition(definition, storedFormDesignId);
  if (!design) {
    return {
      formDesignId: storedFormDesignId,
      label: storedFormDesignId,
      presentation: resolveFormPresentation(definition),
      missing: true,
      isDefault: false,
    };
  }

  return {
    formDesignId: design.id,
    label: design.label,
    presentation: resolveFormPresentation(definition, design.id),
    missing: false,
    isDefault: false,
  };
}

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
  formDesignId?: string,
): FormModalSize {
  return resolveFormModalSizes(
    resolveFormConfigForDesign(definition, formDesignId),
  ).xl;
}

export function resolveFormModalSizeByBreakpointFromDefinition(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): FormModalSizeByBreakpoint {
  return (
    resolveFormConfigForDesign(definition, formDesignId)
      .modalSizeByBreakpoint ?? {}
  );
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
  formDesignId?: string,
): ResolvedFormModalChrome {
  const chrome = resolveFormConfigForDesign(
    definition,
    formDesignId,
  ).modalChrome;
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
  formDesignId?: string,
): import("@repo/ui-builder-core").UiLayoutDocument | undefined {
  return resolveFormConfigForDesign(definition, formDesignId).modalFooterLayout;
}

export function resolveFormUsesModalBuilderFooter(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): boolean {
  const forms = resolveFormConfigForDesign(definition, formDesignId);
  return forms.modalFooterLayout != null || forms.modalChrome != null;
}

export function resolveFormModalActionComponentKind(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): Extract<UiComponentKind, "form-actions" | "wizard-actions"> {
  return resolveFormPresentation(definition, formDesignId) === "wizard"
    ? "wizard-actions"
    : "form-actions";
}

function sharedPlainLayoutFromForms(
  forms: FormConfig,
): UiLayoutDocument | undefined {
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
  forms: FormConfig,
): UiLayoutDocument {
  const createForm = forms.create;
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
  formDesignId?: string,
): import("@repo/ui-builder-core").UiLayoutDocument | undefined {
  const forms = resolveFormConfigForDesign(definition, formDesignId);
  const footerLayout = forms.modalFooterLayout;
  if (footerLayout) {
    return footerLayout;
  }

  const presentation = resolveFormPresentation(definition, formDesignId);
  if (presentation === "wizard") {
    return forms.wizard?.shellLayout;
  }

  return sharedPlainLayoutFromForms(forms);
}

export function resolveFormModalHasLayoutActions(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): boolean {
  const actionLayout = resolveFormModalActionLayout(definition, formDesignId);
  if (!actionLayout) {
    return false;
  }

  const kind = resolveFormModalActionComponentKind(definition, formDesignId);
  return findLayoutComponent(actionLayout, kind) != null;
}

export function resolveFormPresentation(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): FormPresentation {
  const forms = resolveFormConfigForDesign(definition, formDesignId);
  const explicit = forms.presentation;
  if (explicit === "plain" || explicit === "wizard") {
    return explicit;
  }
  if (forms.wizard) {
    return "wizard";
  }
  return "plain";
}

export function resolvePlainFormLayout(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): UiLayoutDocument {
  const forms = resolveFormConfigForDesign(definition, formDesignId);
  const layout = sharedPlainLayoutFromForms(forms);
  if (layout) {
    return layout;
  }

  return upgradeLegacyFormLayout(definition, forms);
}

export function resolveWizardForm(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): WizardFormConfig | undefined {
  return resolveFormConfigForDesign(definition, formDesignId).wizard;
}

/** @deprecated Use resolvePlainFormLayout */
export function resolveCreateFormFromLayout(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): UiLayoutDocument {
  return resolvePlainFormLayout(definition, formDesignId);
}

/** @deprecated Use resolvePlainFormLayout */
export function resolveEditFormFromUi(
  definition: SerializableEntityDefinition,
  formDesignId?: string,
): UiLayoutDocument {
  return resolvePlainFormLayout(definition, formDesignId);
}

export type { FormModalChrome, FormModalContentPadding };
