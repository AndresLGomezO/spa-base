import type { SourceDocumentSnapshot } from "@repo/aggregation-engine";
import {
  createActiveMetricIndex,
  type ActiveMetricIndex,
} from "@repo/event-engine";
import type {
  AggregationEventRepository,
  BackfillJobRepository,
  MetricContributionRepository,
  MetricDefinitionRepository,
  MetricValueRepository,
} from "@repo/firestore-converters";

type SourceDocumentLister = (
  tenantId: string,
  sourceModel: string,
) => Promise<readonly SourceDocumentSnapshot[]>;

export class MetricRuntimeContext {
  readonly activeMetricIndex: ActiveMetricIndex;

  constructor(
    readonly metricDefinitionRepository: MetricDefinitionRepository,
    readonly aggregationEventRepository: AggregationEventRepository,
    readonly metricValueRepository: MetricValueRepository,
    readonly backfillJobRepository: BackfillJobRepository,
    readonly metricContributionRepository: MetricContributionRepository,
    readonly listSourceDocuments?: SourceDocumentLister,
  ) {
    this.activeMetricIndex = createActiveMetricIndex({
      listActive: (tenantId) =>
        this.metricDefinitionRepository.listActive(tenantId),
    });
  }

  invalidateTenantMetrics(tenantId: string): void {
    this.activeMetricIndex.invalidate(tenantId);
  }
}

export function createMetricRuntimeContext(deps: {
  readonly metricDefinitionRepository: MetricDefinitionRepository;
  readonly aggregationEventRepository: AggregationEventRepository;
  readonly metricValueRepository: MetricValueRepository;
  readonly backfillJobRepository: BackfillJobRepository;
  readonly metricContributionRepository: MetricContributionRepository;
  readonly listSourceDocuments?: SourceDocumentLister;
}): MetricRuntimeContext {
  return new MetricRuntimeContext(
    deps.metricDefinitionRepository,
    deps.aggregationEventRepository,
    deps.metricValueRepository,
    deps.backfillJobRepository,
    deps.metricContributionRepository,
    deps.listSourceDocuments,
  );
}
