import type { AggregationEvent } from "@repo/event-engine";
import {
  applyDateGranularityToSlice,
  buildMetricDocId,
  isDocumentCountAggregation,
  recordMatchesFilters,
  resolveMetricOwnerId,
  valueKeyForAggregation,
  type MetricAggregationSpec,
  type MetricDefinitionRecord,
} from "@repo/metrics-engine";

export interface MetricValueDelta {
  readonly docId: string;
  readonly metricName: string;
  readonly userId: string;
  readonly group: Record<string, unknown>;
  readonly dimensions: Record<string, unknown>;
  readonly increments: Record<string, number>;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function contributionForSpec(
  spec: MetricAggregationSpec,
  record: Record<string, unknown>,
  sign: 1 | -1,
): Record<string, number> {
  const increments: Record<string, number> = {};
  const keys = valueKeyForAggregation(spec.operation, spec.field);

  switch (spec.operation) {
    case "SUM": {
      increments[keys[0]!] = sign * toNumber(record[spec.field]);
      break;
    }
    case "COUNT": {
      if (isDocumentCountAggregation(spec)) {
        increments[keys[0]!] = sign;
        break;
      }

      const hasValue =
        record[spec.field!] !== undefined && record[spec.field!] !== null;
      increments[keys[0]!] = sign * (hasValue ? 1 : 0);
      break;
    }
    case "AVG": {
      const hasValue =
        record[spec.field] !== undefined && record[spec.field] !== null;
      increments[keys[0]!] = sign * toNumber(record[spec.field]);
      increments[keys[1]!] = sign * (hasValue ? 1 : 0);
      break;
    }
    default:
      break;
  }

  return increments;
}

function mergeIncrements(
  target: Record<string, number>,
  source: Record<string, number>,
): void {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function buildDeltaForRecord(
  metric: MetricDefinitionRecord,
  record: Record<string, unknown>,
  sign: 1 | -1,
  queryMatch?: boolean,
): MetricValueDelta | null {
  if (!isRecordIncluded(record, metric, queryMatch)) {
    return null;
  }

  const userId = resolveMetricOwnerId(record);
  if (!userId) {
    return null;
  }

  const group = applyDateGranularityToSlice(
    record,
    metric.groupBy,
    metric.dateFieldGranularity,
  );
  const dimensions = applyDateGranularityToSlice(
    record,
    metric.dimensions,
    metric.dateFieldGranularity,
  );
  const increments: Record<string, number> = {};

  for (const spec of metric.aggregations) {
    mergeIncrements(increments, contributionForSpec(spec, record, sign));
  }

  if (Object.keys(increments).length === 0) {
    return null;
  }

  return {
    docId: buildMetricDocId(userId, group, dimensions),
    metricName: metric.target.collection,
    userId,
    group,
    dimensions,
    increments,
  };
}

function negateIncrements(
  increments: Record<string, number>,
): Record<string, number> {
  const negated: Record<string, number> = {};
  for (const [key, value] of Object.entries(increments)) {
    negated[key] = -value;
  }
  return negated;
}

export interface ComputeMetricDeltasOptions {
  /**
   * When false on UPDATE/DELETE, the document was never counted in this metric
   * (pre-metric cold start). UPDATE applies +after only; DELETE is a no-op.
   * When undefined, legacy net-change behavior is preserved.
   */
  readonly hasContributed?: boolean;
  readonly queryMembership?: {
    readonly before?: boolean;
    readonly after?: boolean;
  };
}

function isRecordIncluded(
  record: Record<string, unknown>,
  metric: MetricDefinitionRecord,
  queryMatch?: boolean,
): boolean {
  if (!recordMatchesFilters(record, metric.filters)) {
    return false;
  }

  if (!metric.sourceQueryDefinitionId) {
    return true;
  }

  return queryMatch === true;
}

export function computeCreateDeltaForRecord(
  metric: MetricDefinitionRecord,
  record: Record<string, unknown>,
  queryMatch?: boolean,
): MetricValueDelta | null {
  return buildDeltaForRecord(metric, record, 1, queryMatch);
}

export function computeMetricDeltas(
  event: AggregationEvent,
  metric: MetricDefinitionRecord,
  options?: ComputeMetricDeltasOptions,
): readonly MetricValueDelta[] {
  const before = event.before;
  const after = event.after;
  const deltas: MetricValueDelta[] = [];
  const queryMembership = options?.queryMembership;

  if (event.operation === "CREATE" && after) {
    const delta = buildDeltaForRecord(metric, after, 1, queryMembership?.after);
    if (delta) {
      deltas.push(delta);
    }
    return deltas;
  }

  if (event.operation === "DELETE" && before) {
    if (options?.hasContributed === false) {
      return deltas;
    }

    const delta = buildDeltaForRecord(
      metric,
      before,
      -1,
      queryMembership?.before,
    );
    if (delta) {
      deltas.push(delta);
    }
    return deltas;
  }

  if (event.operation !== "UPDATE" || !before || !after) {
    return deltas;
  }

  const beforeIncluded = isRecordIncluded(
    before,
    metric,
    queryMembership?.before,
  );
  const afterIncluded = isRecordIncluded(after, metric, queryMembership?.after);

  if (beforeIncluded && afterIncluded) {
    if (options?.hasContributed === false) {
      const afterDelta = buildDeltaForRecord(
        metric,
        after,
        1,
        queryMembership?.after,
      );
      if (afterDelta) {
        deltas.push(afterDelta);
      }
      return deltas;
    }

    const beforeDelta = buildDeltaForRecord(
      metric,
      before,
      -1,
      queryMembership?.before,
    );
    const afterDelta = buildDeltaForRecord(
      metric,
      after,
      1,
      queryMembership?.after,
    );
    if (beforeDelta && afterDelta && beforeDelta.docId === afterDelta.docId) {
      const merged: Record<string, number> = { ...beforeDelta.increments };
      mergeIncrements(merged, afterDelta.increments);
      const filtered = Object.fromEntries(
        Object.entries(merged).filter(([, value]) => value !== 0),
      );
      if (Object.keys(filtered).length > 0) {
        deltas.push({
          docId: afterDelta.docId,
          metricName: afterDelta.metricName,
          userId: afterDelta.userId,
          group: afterDelta.group,
          dimensions: afterDelta.dimensions,
          increments: filtered,
        });
      }
      return deltas;
    }
  }

  if (beforeIncluded) {
    if (options?.hasContributed !== false) {
      const remove = buildDeltaForRecord(
        metric,
        before,
        -1,
        queryMembership?.before,
      );
      if (remove) {
        deltas.push(remove);
      }
    }
  }

  if (afterIncluded) {
    const add = buildDeltaForRecord(metric, after, 1, queryMembership?.after);
    if (add) {
      deltas.push(add);
    }
  }

  return deltas;
}

export function mergeMetricDeltas(
  deltas: readonly MetricValueDelta[],
): readonly MetricValueDelta[] {
  const merged = new Map<string, MetricValueDelta>();

  for (const delta of deltas) {
    const key = `${delta.metricName}:${delta.docId}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...delta, increments: { ...delta.increments } });
      continue;
    }

    const increments = { ...existing.increments };
    mergeIncrements(increments, delta.increments);
    merged.set(key, { ...existing, increments });
  }

  return [...merged.values()].filter(
    (delta) => Object.keys(delta.increments).length > 0,
  );
}

export { negateIncrements };
