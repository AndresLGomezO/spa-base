import type { AggregationEvent } from "@repo/event-engine";
import {
  recordMatchesFilters,
  type MetricDefinitionRecord,
} from "@repo/metrics-engine";

import type { ComputeMetricDeltasOptions } from "./delta.js";

export type MetricContributionAction = "mark" | "clear" | "none";

export function resolveContributionAction(
  event: AggregationEvent,
  metric: MetricDefinitionRecord,
  options?: ComputeMetricDeltasOptions,
): MetricContributionAction {
  if (event.operation === "CREATE") {
    return "mark";
  }

  if (event.operation === "DELETE") {
    return options?.hasContributed === false ? "none" : "clear";
  }

  if (event.operation !== "UPDATE" || !event.before || !event.after) {
    return "none";
  }

  const beforeIncluded = recordMatchesFilters(event.before, metric.filters);
  const afterIncluded = recordMatchesFilters(event.after, metric.filters);

  if (afterIncluded) {
    return "mark";
  }

  if (beforeIncluded && options?.hasContributed !== false) {
    return "clear";
  }

  return "none";
}
