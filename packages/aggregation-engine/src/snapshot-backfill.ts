import type { MetricDefinitionRecord } from "@repo/metrics-engine";
import type {
  MetricContributionRepository,
  MetricValueRepository,
} from "@repo/firestore-converters";
import { recordMatchesFilters } from "@repo/metrics-engine";

import {
  computeCreateDeltaForRecord,
  mergeMetricDeltas,
  type MetricValueDelta,
} from "./delta.js";
import { createMetricValueWriter } from "./runtime.js";

export interface SourceDocumentSnapshot {
  readonly documentId: string;
  readonly record: Record<string, unknown>;
}

export async function runSnapshotBackfillForMetric(input: {
  readonly tenantId: string;
  readonly metric: MetricDefinitionRecord;
  readonly documents: readonly SourceDocumentSnapshot[];
  readonly metricValueRepository: MetricValueRepository;
  readonly metricContributionRepository: MetricContributionRepository;
}): Promise<{ readonly processedDocuments: number }> {
  await input.metricValueRepository.deleteAllRows(
    input.tenantId,
    input.metric.target.collection,
  );
  await input.metricContributionRepository.clearForMetric(
    input.tenantId,
    input.metric.id,
  );

  const allDeltas: MetricValueDelta[] = [];
  const contributedDocumentIds: string[] = [];

  for (const document of input.documents) {
    if (!recordMatchesFilters(document.record, input.metric.filters)) {
      continue;
    }

    const delta = computeCreateDeltaForRecord(
      input.metric,
      document.record,
      input.metric.sourceQueryDefinitionId ? true : undefined,
    );
    if (!delta) {
      continue;
    }

    allDeltas.push(delta);
    contributedDocumentIds.push(document.documentId);
  }

  const merged = mergeMetricDeltas(allDeltas);
  const writer = createMetricValueWriter(input.metricValueRepository);
  await writer.applyDeltas(input.tenantId, merged);

  await input.metricContributionRepository.markContributedBatch(
    input.tenantId,
    input.metric.id,
    contributedDocumentIds,
    "snapshot-backfill",
  );

  return { processedDocuments: contributedDocumentIds.length };
}
