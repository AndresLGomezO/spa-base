import type { EntityQueryDraftState } from "../use-entity-query-builder-editor.js";

export type EntityQueryPreviewTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface EntityQueryPreviewBuildContext {
  readonly entityName: string;
  readonly entityLabel: (name: string) => string;
  readonly fieldLabel: (entityName: string, fieldPath: string) => string;
  readonly t: EntityQueryPreviewTranslate;
}

export interface EntityQueryPreviewInput {
  readonly name: string;
  readonly description?: string;
  readonly sourceEntity: string;
  readonly draft: EntityQueryDraftState;
  readonly status: "ACTIVE" | "PAUSED";
}

export type EntityQueryPreviewStepIcon =
  | "source"
  | "filter"
  | "parameters"
  | "sort"
  | "select"
  | "limit"
  | "groupBy"
  | "aggregations"
  | "groupSort"
  | "groupLimit"
  | "output";

export type EntityQueryPreviewStepKind = EntityQueryPreviewStepIcon;

export interface EntityQueryPreviewDetailSection {
  readonly title: string;
  readonly bullets?: readonly string[];
}

export interface EntityQueryPreviewStep {
  readonly id: string;
  readonly kind: EntityQueryPreviewStepKind;
  readonly icon: EntityQueryPreviewStepIcon;
  readonly title: string;
  readonly summary: string;
  readonly bullets?: readonly string[];
  readonly details?: readonly EntityQueryPreviewDetailSection[];
}

export interface EntityQueryPreviewModel {
  readonly name: string;
  readonly description?: string;
  readonly queryMode: EntityQueryDraftState["queryMode"];
  readonly steps: readonly EntityQueryPreviewStep[];
  readonly metaChips: readonly string[];
}

export type EntityQuerySummaryMode = "overview" | "details" | "advanced";
