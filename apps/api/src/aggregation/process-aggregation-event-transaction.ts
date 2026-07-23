import {
  processAggregationEventTransaction as processTransaction,
  type MetricRuntimeContext,
} from "@repo/aggregation-engine";

export async function processAggregationEventTransaction(
  metricRuntime: MetricRuntimeContext,
  tenantId: string,
  eventId: string,
  log?: (message: string, meta: Record<string, unknown>) => void,
): Promise<void> {
  await processTransaction(
    {
      aggregationEventRepository: metricRuntime.aggregationEventRepository,
      metricDefinitionRepository: metricRuntime.metricDefinitionRepository,
      metricValueRepository: metricRuntime.metricValueRepository,
      metricContributionRepository: metricRuntime.metricContributionRepository,
      resolveQueryMembership: metricRuntime.resolveQueryMembership,
    },
    tenantId,
    eventId,
    log,
  );
}
