import type { UiLayoutDocument } from "@repo/ui-builder-core";

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

import type { FormModalSize } from "./types.js";

export interface EntityUiOverrideForms {
  readonly presentation?: FormPresentation;
  readonly layout?: UiLayoutDocument;
  readonly wizard?: WizardFormConfig;
  readonly modalSize?: FormModalSize;
  /** @deprecated Prefer unified `layout`. */
  readonly create?: UiLayoutDocument;
  /** @deprecated Prefer unified `layout`. */
  readonly edit?: UiLayoutDocument;
}
