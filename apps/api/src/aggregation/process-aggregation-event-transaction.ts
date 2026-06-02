import { processAggregationEventTransaction as processTransaction } from "@repo/aggregation-engine";

import type { MetricRuntimeContext } from "./metric-runtime-context.js";

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
    },
    tenantId,
    eventId,
    log,
  );
}
