import type { EmailMatchingDraft } from "../email-matching-draft";

export type EmailMatchingPreviewTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface EmailMatchingPreviewBuildContext {
  readonly entityLabel: (name: string) => string;
  readonly t: EmailMatchingPreviewTranslate;
}

export interface EmailMatchingPreviewDetailSection {
  readonly title: string;
  readonly bullets?: readonly string[];
}

export type EmailMatchingPreviewStepIcon =
  | "target"
  | "senders"
  | "subject"
  | "body"
  | "extractors"
  | "ingest";

export type EmailMatchingPreviewStepKind =
  | "target"
  | "senders"
  | "subject"
  | "body"
  | "extractors"
  | "ingest";

export interface EmailMatchingPreviewStep {
  readonly id: string;
  readonly kind: EmailMatchingPreviewStepKind;
  readonly icon: EmailMatchingPreviewStepIcon;
  readonly title: string;
  readonly summary: string;
  readonly bullets?: readonly string[];
  readonly details?: readonly EmailMatchingPreviewDetailSection[];
}

export interface EmailMatchingPreviewModel {
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly EmailMatchingPreviewStep[];
  readonly metaChips: readonly string[];
}

export type EmailMatchingSummaryMode = "overview" | "details" | "advanced";

export interface EmailMatchingPreviewInput {
  readonly name: string;
  readonly description?: string;
  readonly entityName: string;
  readonly recordId: string;
  /** Human display label for the target record when resolved. */
  readonly recordName?: string | null;
  readonly draft: EmailMatchingDraft;
}
