import { runSnapshotBackfillForMetric } from "@repo/aggregation-engine";
import { intersectsFields } from "@repo/metrics-engine";
import type { MetricDefinitionRecord } from "@repo/metrics-engine";

import type { MetricRuntimeContext } from "./metric-runtime-context.js";

export function validateBackfillRequest(input: {
  readonly current: MetricDefinitionRecord;
  readonly previousVersion: number;
  readonly changedDefinitionFields: readonly string[];
}): void {
  if (input.current.version <= input.previousVersion) {
    throw new Error(
      "Backfill requires a metric version increase since the last run.",
    );
  }

  if (
    !intersectsFields(
      input.changedDefinitionFields,
      input.current.fieldsDependency,
    )
  ) {
    throw new Error("Backfill requires changes that affect fieldsDependency.");
  }
}

export async function runMetricBackfill(
  metricRuntime: MetricRuntimeContext,
  tenantId: string,
  metricDefinitionId: string,
  options?: {
    readonly changedDefinitionFields?: readonly string[];
    readonly previousVersion?: number;
  },
): Promise<{ readonly processedDocuments: number }> {
  const metric = await metricRuntime.metricDefinitionRepository.getById(
    tenantId,
    metricDefinitionId,
  );
  if (!metric) {
    throw new Error(`Metric definition not found: ${metricDefinitionId}`);
  }

  const hasPriorCompletedBackfill =
    await metricRuntime.backfillJobRepository.hasCompletedBackfillForMetric(
      tenantId,
      metricDefinitionId,
    );

  if (hasPriorCompletedBackfill) {
    if (options?.previousVersion === undefined) {
      throw new Error(
        "Update the metric definition before running backfill again.",
      );
    }

    validateBackfillRequest({
      current: metric,
      previousVersion: options.previousVersion,
      changedDefinitionFields: options.changedDefinitionFields ?? [],
    });
  }

  if (!metricRuntime.listSourceDocuments) {
    throw new Error(
      "Source document listing is not configured for metric backfill.",
    );
  }

  const job = await metricRuntime.backfillJobRepository.create(tenantId, {
    metricDefinitionId,
    sourceModel: metric.sourceModel,
  });

  await metricRuntime.backfillJobRepository.update(tenantId, job.id, {
    status: "RUNNING",
  });

  const documents = await metricRuntime.listSourceDocuments(
    tenantId,
    metric.sourceModel,
  );

  try {
    const result = await runSnapshotBackfillForMetric({
      tenantId,
      metric,
      documents,
      metricValueRepository: metricRuntime.metricValueRepository,
      metricContributionRepository: metricRuntime.metricContributionRepository,
    });

    await metricRuntime.backfillJobRepository.update(tenantId, job.id, {
      status: "COMPLETED",
      processedEvents: result.processedDocuments,
      totalEvents: documents.length,
    });

    return { processedDocuments: result.processedDocuments };
  } catch (error) {
    await metricRuntime.backfillJobRepository.update(tenantId, job.id, {
      status: "FAILED",
      processedEvents: 0,
      totalEvents: documents.length,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
