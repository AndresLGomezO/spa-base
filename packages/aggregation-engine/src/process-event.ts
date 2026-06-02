import type { AggregationEvent } from "@repo/event-engine";
import {
  metricMatchesEvent,
  type MetricDefinitionRecord,
} from "@repo/metrics-engine";
import type { MetricContributionRepository } from "@repo/firestore-converters";

import { resolveContributionAction } from "./contribution.js";
import {
  computeMetricDeltas,
  mergeMetricDeltas,
  type MetricValueDelta,
} from "./delta.js";

export interface MetricValueWriter {
  applyDeltas(
    tenantId: string,
    deltas: readonly MetricValueDelta[],
  ): Promise<void>;
}

interface MetricContributionUpdate {
  readonly metricDefinitionId: string;
  readonly action: "mark" | "clear";
}

export function selectMetricsForEvent(
  definitions: readonly MetricDefinitionRecord[],
  event: AggregationEvent,
): readonly MetricDefinitionRecord[] {
  return definitions.filter((definition) =>
    metricMatchesEvent(definition, event),
  );
}

export async function processAggregationEvent(input: {
  readonly event: AggregationEvent;
  readonly definitions: readonly MetricDefinitionRecord[];
  readonly writer: MetricValueWriter;
  readonly metricContributionRepository?: MetricContributionRepository;
}): Promise<void> {
  const relevant = selectMetricsForEvent(input.definitions, input.event);
  const allDeltas: MetricValueDelta[] = [];
  const contributionUpdates: MetricContributionUpdate[] = [];

  for (const metric of relevant) {
    let hasContributed: boolean | undefined;
    if (
      input.metricContributionRepository &&
      (input.event.operation === "UPDATE" || input.event.operation === "DELETE")
    ) {
      hasContributed = await input.metricContributionRepository.hasContributed(
        input.event.tenantId,
        metric.id,
        input.event.documentId,
      );
    }

    const deltaOptions =
      hasContributed === undefined ? undefined : { hasContributed };
    allDeltas.push(...computeMetricDeltas(input.event, metric, deltaOptions));

    if (input.metricContributionRepository) {
      const action = resolveContributionAction(
        input.event,
        metric,
        deltaOptions,
      );
      if (action !== "none") {
        contributionUpdates.push({
          metricDefinitionId: metric.id,
          action,
        });
      }
    }
  }

  const merged = mergeMetricDeltas(allDeltas);
  if (merged.length > 0) {
    await input.writer.applyDeltas(input.event.tenantId, merged);
  }

  if (!input.metricContributionRepository || contributionUpdates.length === 0) {
    return;
  }

  for (const update of contributionUpdates) {
    if (update.action === "mark") {
      await input.metricContributionRepository.markContributed(
        input.event.tenantId,
        update.metricDefinitionId,
        input.event.documentId,
        input.event.eventId,
      );
      continue;
    }

    await input.metricContributionRepository.clearContribution(
      input.event.tenantId,
      update.metricDefinitionId,
      input.event.documentId,
    );
  }
}
