import { runSnapshotBackfillForMetric } from "@repo/aggregation-engine";
import { parseMetricDefinitionsCatalogJson } from "@repo/metrics-engine";
import {
  createFirestoreAdminAggregationEventRepository,
  createFirestoreAdminBackfillJobRepository,
  createFirestoreAdminMetricContributionRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminMetricValueRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import {
  createMetricQueryMembershipResolver,
  listSourceDocumentsForMetricDefinition,
} from "../../aggregation/metric-query-runtime.js";
import { runMetricBackfill } from "../../aggregation/run-backfill.js";
import { createMetricRuntimeContext } from "../../aggregation/metric-runtime-context.js";
import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import { createFirestoreAdminEntityQueryDefinitionRepository } from "@repo/gcp-firebase";
import { loadMetricDefinitionsCatalogJson } from "./seed-catalog-dir.js";

interface BackfillRatesMetricsResult {
  readonly activated: number;
  readonly backfilled: number;
  readonly totalProcessedDocuments: number;
  readonly failures: readonly {
    readonly metricName: string;
    readonly error: string;
  }[];
}

function loadRatesMetricNames(): readonly string[] {
  const parsed = parseMetricDefinitionsCatalogJson(
    loadMetricDefinitionsCatalogJson(),
  );
  if (!parsed.ok) {
    throw new Error(
      `Invalid rates metric catalog: ${parsed.errors.map((error) => error.message).join("; ")}`,
    );
  }
  return parsed.data.metricDefinitions.map((metric) => metric.name);
}

export async function activateAndBackfillRatesMetrics(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
): Promise<BackfillRatesMetricsResult> {
  await entityRuntime.loadTenantDefinitions(tenantId, { force: true });

  const metricDefinitionRepository =
    createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig);
  const entityQueryDefinitionRepository =
    createFirestoreAdminEntityQueryDefinitionRepository(firebaseAdminConfig);
  const metricValueRepository =
    createFirestoreAdminMetricValueRepository(firebaseAdminConfig);
  const metricContributionRepository =
    createFirestoreAdminMetricContributionRepository(firebaseAdminConfig);
  const backfillJobRepository =
    createFirestoreAdminBackfillJobRepository(firebaseAdminConfig);
  const aggregationEventRepository =
    createFirestoreAdminAggregationEventRepository(firebaseAdminConfig);

  const metricRuntime = createMetricRuntimeContext({
    metricDefinitionRepository,
    aggregationEventRepository,
    metricValueRepository,
    backfillJobRepository,
    metricContributionRepository,
    listSourceDocuments: (resolvedTenantId, metric) =>
      listSourceDocumentsForMetricDefinition(
        entityRuntime,
        entityQueryDefinitionRepository,
        resolvedTenantId,
        metric,
      ),
    resolveQueryMembership: createMetricQueryMembershipResolver({
      entityRuntime,
      entityQueryDefinitionRepository,
    }),
  });

  const desiredNames = new Set(loadRatesMetricNames());
  const metrics = (await metricDefinitionRepository.list(tenantId))
    .filter((metric) => desiredNames.has(metric.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  let activated = 0;
  let backfilled = 0;
  let totalProcessedDocuments = 0;
  const failures: { metricName: string; error: string }[] = [];

  for (const metric of metrics) {
    try {
      let current = metric;
      if (current.status !== "ACTIVE") {
        current = await metricDefinitionRepository.update(
          tenantId,
          current.id,
          {
            status: "ACTIVE",
          },
        );
        activated += 1;
        metricRuntime.invalidateTenantMetrics(tenantId);
      }

      const hasCompleted =
        await backfillJobRepository.hasCompletedBackfillForMetric(
          tenantId,
          current.id,
        );

      if (hasCompleted) {
        const documents = await listSourceDocumentsForMetricDefinition(
          entityRuntime,
          entityQueryDefinitionRepository,
          tenantId,
          current,
        );
        const result = await runSnapshotBackfillForMetric({
          tenantId,
          metric: current,
          documents,
          metricValueRepository,
          metricContributionRepository,
        });

        const job = await backfillJobRepository.create(tenantId, {
          metricDefinitionId: current.id,
          sourceModel: current.sourceModel,
        });
        await backfillJobRepository.update(tenantId, job.id, {
          status: "COMPLETED",
          processedEvents: result.processedDocuments,
          totalEvents: documents.length,
        });

        totalProcessedDocuments += result.processedDocuments;
      } else {
        const result = await runMetricBackfill(
          metricRuntime,
          tenantId,
          current.id,
        );
        totalProcessedDocuments += result.processedDocuments;
      }

      backfilled += 1;
      console.log(
        `[rates seed] Backfilled "${current.name}" (${current.sourceModel})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ metricName: metric.name, error: message });
      console.error(
        `[rates seed] Failed to backfill "${metric.name}": ${message}`,
      );
    }
  }

  return {
    activated,
    backfilled,
    totalProcessedDocuments,
    failures,
  };
}
