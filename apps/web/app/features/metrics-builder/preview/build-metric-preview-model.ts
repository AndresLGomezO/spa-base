import type { MetricDefinitionDraft } from "../../../components/metrics/metric-definition-draft.js";
import type { MetricFilterEditorRow } from "../../../components/metrics/metric-field-utils.js";
import {
  formatParametersPreview,
  formatComputationPreview,
} from "../../../components/metrics/MetricComputationPreview.js";
import type {
  MetricPreviewBuildContext,
  MetricPreviewDetailSection,
  MetricPreviewInput,
  MetricPreviewModel,
  MetricPreviewStep,
} from "./metric-preview-types.js";

function formatFilterRows(
  rows: readonly MetricFilterEditorRow[],
  entityName: string,
  context: MetricPreviewBuildContext,
): readonly string[] {
  return rows
    .filter((row) => row.field.trim().length > 0)
    .map((row) => {
      const field = context.fieldLabel(entityName, row.field);
      if (row.op === "eq") {
        return context.t("metrics.preview.filters.eq", {
          field,
          value: row.scalarValue.trim() || "?",
        });
      }
      const values =
        row.listValues.filter((value) => value.trim().length > 0).join(", ") ||
        "?";
      return context.t("metrics.preview.filters.in", { field, values });
    });
}

function buildMetaChips(
  input: MetricPreviewInput,
  context: MetricPreviewBuildContext,
): readonly string[] {
  const chips: string[] = [];
  chips.push(
    input.draft.computationMode === "computed"
      ? context.t("metrics.workbench.list.modeComputed")
      : context.t("metrics.workbench.list.modeAggregated"),
  );
  chips.push(
    input.draft.sourceQueryDefinitionId.trim().length > 0
      ? context.t("metrics.workbench.list.sourceTypeQuery")
      : context.t("metrics.workbench.list.sourceTypeEntity"),
  );
  if (input.status === "PAUSED") {
    chips.push(context.t("metrics.statusValues.PAUSED"));
  }
  chips.push(
    context.t("metrics.preview.displayFormat", {
      format: input.draft.valueDisplayFormat,
    }),
  );
  return chips;
}

function buildAggregatedSourceStep(
  draft: MetricDefinitionDraft,
  context: MetricPreviewBuildContext,
): MetricPreviewStep {
  const isQuery = draft.sourceQueryDefinitionId.trim().length > 0;
  const summary = isQuery
    ? context.t("metrics.preview.aggregated.sourceQuery", {
        query: context.queryLabel(draft.sourceQueryDefinitionId),
      })
    : context.t("metrics.preview.aggregated.sourceEntity", {
        entity: context.entityLabel(draft.sourceModel),
      });

  return {
    id: "source",
    kind: "source",
    icon: "source",
    title: context.t("metrics.preview.steps.source"),
    summary,
  };
}

function buildFilterStep(
  draft: MetricDefinitionDraft,
  context: MetricPreviewBuildContext,
): MetricPreviewStep | null {
  const bullets = formatFilterRows(
    draft.filterRows,
    draft.sourceModel,
    context,
  );
  if (bullets.length === 0) {
    return null;
  }

  return {
    id: "filters",
    kind: "filter",
    icon: "filter",
    title: context.t("metrics.preview.steps.filters"),
    summary: context.t("metrics.preview.aggregated.filtersSummary", {
      count: bullets.length,
    }),
    bullets,
    details: [
      {
        title: context.t("metrics.preview.details.matchWhere"),
        bullets,
      },
    ],
  };
}

function buildAggregationStep(
  draft: MetricDefinitionDraft,
  context: MetricPreviewBuildContext,
): MetricPreviewStep {
  const operation = draft.aggregationOperation;
  const field =
    operation === "COUNT"
      ? context.t("metrics.preview.aggregated.records")
      : context.fieldLabel(draft.sourceModel, draft.aggregationField) ||
        draft.aggregationField ||
        "?";

  const summary = context.t(
    `metrics.preview.aggregated.aggregation.${operation}`,
    {
      field,
    },
  );

  const bullets: string[] = [];
  if (draft.groupBy.length > 0) {
    bullets.push(
      context.t("metrics.preview.aggregated.groupBy", {
        fields: draft.groupBy
          .map((entry) => context.fieldLabel(draft.sourceModel, entry))
          .join(", "),
      }),
    );
  }
  if (draft.dimensions.length > 0) {
    bullets.push(
      context.t("metrics.preview.aggregated.dimensions", {
        fields: draft.dimensions
          .map((entry) => context.fieldLabel(draft.sourceModel, entry))
          .join(", "),
      }),
    );
  }

  const details: MetricPreviewDetailSection[] = [];
  if (draft.fieldsDependency.length > 0) {
    details.push({
      title: context.t("metrics.preview.details.fieldsDependency"),
      bullets: draft.fieldsDependency.map((entry) =>
        context.fieldLabel(draft.sourceModel, entry),
      ),
    });
  }

  return {
    id: "aggregation",
    kind: "aggregate",
    icon: "aggregate",
    title: context.t("metrics.preview.steps.aggregation"),
    summary,
    ...(bullets.length > 0 ? { bullets } : {}),
    ...(details.length > 0 ? { details } : {}),
  };
}

function buildOutputStep(
  draft: MetricDefinitionDraft,
  context: MetricPreviewBuildContext,
): MetricPreviewStep {
  return {
    id: "output",
    kind: "output",
    icon: "output",
    title: context.t("metrics.preview.steps.output"),
    summary: context.t("metrics.preview.outputSummary", {
      format: draft.valueDisplayFormat,
    }),
  };
}

function buildParametersStep(
  draft: MetricDefinitionDraft,
  context: MetricPreviewBuildContext,
): MetricPreviewStep {
  const parameterLines = formatParametersPreview(draft.parameters, {
    none: context.t("metrics.computed.preview.noParameters"),
    deriveFrom: context.t("metrics.computed.preview.deriveFrom"),
    shift: context.t("metrics.computed.preview.shift"),
  })
    .split("\n")
    .filter((line) => line.trim().length > 0);

  return {
    id: "parameters",
    kind: "parameters",
    icon: "parameters",
    title: context.t("metrics.preview.steps.parameters"),
    summary:
      parameterLines.length > 0
        ? context.t("metrics.preview.computed.parametersSummary", {
            count: draft.parameters.length,
          })
        : context.t("metrics.preview.computed.noParameters"),
    ...(parameterLines.length > 0 ? { bullets: parameterLines } : {}),
    details:
      parameterLines.length > 0
        ? [
            {
              title: context.t("metrics.computed.preview.parametersHeading"),
              bullets: parameterLines,
            },
          ]
        : undefined,
  };
}

function buildComputationStep(
  draft: MetricDefinitionDraft,
  context: MetricPreviewBuildContext,
): MetricPreviewStep {
  const computation = draft.computation;
  const type = computation?.type ?? "percentChange";
  const summary = context.t(`metrics.preview.computed.computation.${type}`);

  const inputBullets: string[] = [];
  if (computation) {
    const previewLines = formatComputationPreview(
      computation,
      (id) => context.metricLabel(id),
      (id) => context.queryLabel(id),
      {
        current: context.t("metrics.computed.computation.current"),
        baseline: context.t("metrics.computed.computation.baseline"),
        numerator: context.t("metrics.computed.computation.numerator"),
        denominator: context.t("metrics.computed.computation.denominator"),
        percentChange: context.t(
          "metrics.computed.computation.types.percentChange",
        ),
        difference: context.t("metrics.computed.computation.types.difference"),
        ratio: context.t("metrics.computed.computation.types.ratio"),
        expression: context.t("metrics.computed.computation.types.expression"),
        inputs: context.t("metrics.computed.computation.expressionInputs"),
      },
    )
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    inputBullets.push(...previewLines);
  }

  return {
    id: "computation",
    kind: "computation",
    icon: "computation",
    title: context.t("metrics.preview.steps.computation"),
    summary,
    ...(inputBullets.length > 0 ? { bullets: inputBullets.slice(0, 4) } : {}),
    details:
      inputBullets.length > 0
        ? [
            {
              title: context.t("metrics.computed.preview.computationHeading"),
              bullets: inputBullets,
            },
          ]
        : undefined,
  };
}

export function buildMetricPreviewModel(
  input: MetricPreviewInput,
  context: MetricPreviewBuildContext,
): MetricPreviewModel {
  const steps: MetricPreviewStep[] =
    input.draft.computationMode === "computed"
      ? [
          buildParametersStep(input.draft, context),
          buildComputationStep(input.draft, context),
          buildOutputStep(input.draft, context),
        ]
      : (() => {
          const filterStep = buildFilterStep(input.draft, context);
          return [
            buildAggregatedSourceStep(input.draft, context),
            ...(filterStep ? [filterStep] : []),
            buildAggregationStep(input.draft, context),
            buildOutputStep(input.draft, context),
          ];
        })();

  return {
    name: input.name,
    description: input.description,
    mode: input.draft.computationMode,
    steps,
    metaChips: buildMetaChips(input, context),
  };
}

export function formatMetricAdvancedPreview(
  draft: MetricDefinitionDraft,
  context: MetricPreviewBuildContext,
): string {
  if (draft.computationMode === "computed" && draft.computation) {
    return formatComputationPreview(
      draft.computation,
      (id) => context.metricLabel(id),
      (id) => context.queryLabel(id),
      {
        current: context.t("metrics.computed.computation.current"),
        baseline: context.t("metrics.computed.computation.baseline"),
        numerator: context.t("metrics.computed.computation.numerator"),
        denominator: context.t("metrics.computed.computation.denominator"),
        percentChange: context.t(
          "metrics.computed.computation.types.percentChange",
        ),
        difference: context.t("metrics.computed.computation.types.difference"),
        ratio: context.t("metrics.computed.computation.types.ratio"),
        expression: context.t("metrics.computed.computation.types.expression"),
        inputs: context.t("metrics.computed.computation.expressionInputs"),
      },
    );
  }

  const lines: string[] = [];
  lines.push(
    draft.sourceQueryDefinitionId.trim().length > 0
      ? `sourceQuery: ${context.queryLabel(draft.sourceQueryDefinitionId)}`
      : `sourceEntity: ${context.entityLabel(draft.sourceModel)}`,
  );
  lines.push(`aggregation: ${draft.aggregationOperation}`);
  if (draft.aggregationField.trim()) {
    lines.push(`field: ${draft.aggregationField}`);
  }
  const filters = formatFilterRows(
    draft.filterRows,
    draft.sourceModel,
    context,
  );
  if (filters.length > 0) {
    lines.push("filters:");
    for (const filter of filters) {
      lines.push(`  - ${filter}`);
    }
  }
  if (draft.groupBy.length > 0) {
    lines.push(`groupBy: ${draft.groupBy.join(", ")}`);
  }
  if (draft.dimensions.length > 0) {
    lines.push(`dimensions: ${draft.dimensions.join(", ")}`);
  }
  lines.push(`displayFormat: ${draft.valueDisplayFormat}`);
  return lines.join("\n");
}
