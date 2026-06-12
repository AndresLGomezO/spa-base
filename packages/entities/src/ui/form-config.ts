import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { FormModalSize, FormModalSizeByBreakpoint } from "./types.js";

export type FormPresentation = "plain" | "wizard";

export type WizardStepStatus = "pending" | "active" | "completed" | "invalid";

export interface WizardStepConfig {
  readonly id: string;
  readonly label: string;
  readonly subtitle?: string;
  readonly icon?: string;
  readonly layout: UiLayoutDocument;
}

export interface WizardFormConfig {
  readonly shellLayout: UiLayoutDocument;
  readonly steps: readonly WizardStepConfig[];
}

export type FormModalContentPadding = "default" | "none";

export interface FormModalChrome {
  readonly showHeader?: boolean;
  readonly contentPadding?: FormModalContentPadding;
}

export interface EntityUiOverrideForms {
  readonly presentation?: FormPresentation;
  readonly layout?: UiLayoutDocument;
  readonly wizard?: WizardFormConfig;
  readonly modalSize?: FormModalSize;
  readonly modalSizeByBreakpoint?: FormModalSizeByBreakpoint;
  readonly modalChrome?: FormModalChrome;
  readonly modalFooterLayout?: UiLayoutDocument;
  /** @deprecated Prefer unified `layout`. */
  readonly create?: UiLayoutDocument;
  /** @deprecated Prefer unified `layout`. */
  readonly edit?: UiLayoutDocument;
}
