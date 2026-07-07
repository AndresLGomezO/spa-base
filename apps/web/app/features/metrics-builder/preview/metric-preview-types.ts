import type { MetricDefinitionDraft } from "../../../components/metrics/metric-definition-draft.js";

export type MetricPreviewTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface MetricPreviewBuildContext {
  readonly entityLabel: (name: string) => string;
  readonly fieldLabel: (entityName: string, fieldPath: string) => string;
  readonly queryLabel: (queryId: string) => string;
  readonly metricLabel: (metricId: string) => string;
  readonly t: MetricPreviewTranslate;
}

export interface MetricPreviewInput {
  readonly name: string;
  readonly description?: string;
  readonly draft: MetricDefinitionDraft;
  readonly status: "ACTIVE" | "PAUSED";
}

export type MetricPreviewStepIcon =
  | "source"
  | "filter"
  | "aggregate"
  | "parameters"
  | "computation"
  | "output";

export type MetricPreviewStepKind =
  | "source"
  | "filter"
  | "aggregate"
  | "parameters"
  | "computation"
  | "output";

export interface MetricPreviewDetailSection {
  readonly title: string;
  readonly bullets?: readonly string[];
}

export interface MetricPreviewStep {
  readonly id: string;
  readonly kind: MetricPreviewStepKind;
  readonly icon: MetricPreviewStepIcon;
  readonly title: string;
  readonly summary: string;
  readonly bullets?: readonly string[];
  readonly details?: readonly MetricPreviewDetailSection[];
}

export interface MetricPreviewModel {
  readonly name: string;
  readonly description?: string;
  readonly mode: MetricDefinitionDraft["computationMode"];
  readonly steps: readonly MetricPreviewStep[];
  readonly metaChips: readonly string[];
}

export type MetricSummaryMode = "overview" | "details" | "advanced";
