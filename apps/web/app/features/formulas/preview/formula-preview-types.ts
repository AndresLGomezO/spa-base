import type { ExpressionNode } from "@repo/hooks";
import type { FormulaDefinitionRecord } from "../../../lib/api-client";

export type FormulaPreviewTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface FormulaPreviewBuildContext {
  readonly t: FormulaPreviewTranslate;
}

export interface FormulaPreviewDetailSection {
  readonly title: string;
  readonly bullets?: readonly string[];
}

export type FormulaPreviewStepIcon =
  | "purpose"
  | "inputs"
  | "output"
  | "expression";

export type FormulaPreviewStepKind =
  | "purpose"
  | "inputs"
  | "output"
  | "expression";

export interface FormulaPreviewStep {
  readonly id: string;
  readonly kind: FormulaPreviewStepKind;
  readonly icon: FormulaPreviewStepIcon;
  readonly title: string;
  readonly summary: string;
  readonly bullets?: readonly string[];
  readonly details?: readonly FormulaPreviewDetailSection[];
}

export interface FormulaPreviewModel {
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly FormulaPreviewStep[];
  readonly metaChips: readonly string[];
  readonly body: ExpressionNode;
}

export type FormulaSummaryMode = "overview" | "details" | "advanced";

export interface FormulaPreviewInput {
  readonly definition: FormulaDefinitionRecord;
  readonly summaryText: string;
  readonly detailBullets: readonly string[];
  readonly exampleInputs: Readonly<Record<string, unknown>>;
  readonly exampleOutput: string | null;
  readonly exampleOutputError: string | null;
}
