import { outputKeyForAggregation } from "@repo/entity-queries/browser";

import type { EntityQueryParameterEditorRow } from "../../../components/entity/entity-query-aggregation-editor-utils.js";
import {
  isEntityQueryParameterScalarValue,
  type EntityQueryFilterEditorCondition,
  type EntityQueryFilterEditorGroup,
  type EntityQueryFilterEditorNode,
  type EntityQuerySortEditorRow,
} from "../../../components/entity/entity-query-filter-utils.js";
import type { EntityQueryDraftState } from "../use-entity-query-builder-editor.js";
import type {
  EntityQueryPreviewBuildContext,
  EntityQueryPreviewInput,
  EntityQueryPreviewModel,
  EntityQueryPreviewStep,
} from "./entity-query-preview-types.js";

function formatConditionValue(
  condition: EntityQueryFilterEditorCondition,
  context: EntityQueryPreviewBuildContext,
): string {
  if (condition.valueKind === "temporal") {
    return context.t(
      `queryBuilder.filters.temporalPresets.${condition.temporalPreset}`,
    );
  }

  if (isEntityQueryParameterScalarValue(condition.scalarValue)) {
    return condition.scalarValue.trim();
  }

  if (condition.operator === "in") {
    const values =
      condition.listValues
        .filter((value) => value.trim().length > 0)
        .join(", ") ||
      condition.scalarValue.trim() ||
      "?";
    return values;
  }

  return condition.scalarValue.trim() || "?";
}

function formatFilterNode(
  node: EntityQueryFilterEditorNode,
  context: EntityQueryPreviewBuildContext,
): readonly string[] {
  if (node.type === "condition") {
    if (node.field.trim().length === 0) {
      return [];
    }

    const field = context.fieldLabel(context.entityName, node.field);
    const operator = context.t(
      `queryBuilder.filters.operators.${node.operator}`,
    );
    const value = formatConditionValue(node, context);

    return [
      context.t("queryBuilder.howItWorks.filters.condition", {
        field,
        operator,
        value,
      }),
    ];
  }

  const childBullets = node.children.flatMap((child) =>
    formatFilterNode(child, context),
  );
  if (childBullets.length === 0) {
    return [];
  }

  const combinator = context.t(
    `queryBuilder.filters.combinator.${node.combinator}`,
  );
  return [
    context.t("queryBuilder.howItWorks.filters.group", { combinator }),
    ...childBullets.map((line) => `  ${line}`),
  ];
}

function formatFilterBullets(
  filter: EntityQueryFilterEditorGroup,
  context: EntityQueryPreviewBuildContext,
): readonly string[] {
  const allConditions = filter.children.every(
    (child) => child.type === "condition",
  );
  if (allConditions) {
    return filter.children.flatMap((child) => formatFilterNode(child, context));
  }
  return formatFilterNode(filter, context);
}

function countFilterConditions(node: EntityQueryFilterEditorNode): number {
  if (node.type === "condition") {
    return node.field.trim().length > 0 ? 1 : 0;
  }
  return node.children.reduce(
    (total, child) => total + countFilterConditions(child),
    0,
  );
}

function formatParameterBullets(
  parameters: readonly EntityQueryParameterEditorRow[],
  context: EntityQueryPreviewBuildContext,
): readonly string[] {
  return parameters
    .filter((parameter) => parameter.name.trim().length > 0)
    .map((parameter) => {
      const typeLabel = context.t(
        `queryBuilder.parameters.valueTypes.${parameter.valueType}`,
      );
      const granularity =
        parameter.valueType === "dateBucket" && parameter.granularity
          ? context.t(
              `queryBuilder.parameters.granularity.${parameter.granularity}`,
            )
          : null;
      const field =
        parameter.field.trim().length > 0
          ? context.fieldLabel(context.entityName, parameter.field)
          : null;

      return context.t("queryBuilder.howItWorks.parameters.row", {
        name: parameter.name,
        type: granularity ? `${typeLabel} (${granularity})` : typeLabel,
        field: field ?? context.t("queryBuilder.howItWorks.parameters.noField"),
      });
    });
}

function formatSortBullets(
  rows: readonly EntityQuerySortEditorRow[],
  context: EntityQueryPreviewBuildContext,
): readonly string[] {
  return rows
    .filter((row) => row.field.trim().length > 0)
    .map((row) => {
      const field = context.fieldLabel(context.entityName, row.field);
      const direction =
        row.direction === "asc"
          ? context.t("queryBuilder.sort.asc")
          : context.t("queryBuilder.sort.desc");
      return context.t("queryBuilder.howItWorks.records.sortRow", {
        field,
        direction,
      });
    });
}

function formatAggregationBullets(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): readonly string[] {
  return draft.aggregations
    .filter((row) => row.operation === "COUNT" || row.field.trim().length > 0)
    .map((row) => {
      const field =
        row.operation === "COUNT"
          ? context.t("queryBuilder.howItWorks.aggregated.records")
          : context.fieldLabel(context.entityName, row.field);
      const outputKey = outputKeyForAggregation(
        row.operation,
        row.field.trim() || undefined,
      );
      return context.t(
        `queryBuilder.howItWorks.aggregated.aggregation.${row.operation}`,
        { field, outputKey },
      );
    });
}

function buildMetaChips(
  input: EntityQueryPreviewInput,
  context: EntityQueryPreviewBuildContext,
  filterCount: number,
): readonly string[] {
  const chips: string[] = [];
  chips.push(
    input.draft.queryMode === "aggregated"
      ? context.t("queryBuilder.queryMode.aggregated")
      : context.t("queryBuilder.queryMode.records"),
  );
  if (input.status === "PAUSED") {
    chips.push(context.t("queryBuilder.statusValues.PAUSED"));
  }
  if (input.draft.queryMode === "records") {
    chips.push(
      input.draft.limitMode === "topN"
        ? context.t("queryBuilder.limit.topN")
        : context.t("queryBuilder.limit.all"),
    );
  }
  if (input.draft.parameters.length > 0) {
    chips.push(
      context.t("queryBuilder.howItWorks.meta.parameters", {
        count: input.draft.parameters.length,
      }),
    );
  }
  if (filterCount > 0) {
    chips.push(
      context.t("queryBuilder.howItWorks.meta.filters", { count: filterCount }),
    );
  }
  return chips;
}

function buildSourceStep(
  sourceEntity: string,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep {
  return {
    id: "source",
    kind: "source",
    icon: "source",
    title: context.t("queryBuilder.howItWorks.steps.source"),
    summary: context.t("queryBuilder.howItWorks.records.source", {
      entity: context.entityLabel(sourceEntity),
    }),
  };
}

function buildParametersStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep | null {
  const bullets = formatParameterBullets(draft.parameters, context);
  if (bullets.length === 0) {
    return null;
  }

  return {
    id: "parameters",
    kind: "parameters",
    icon: "parameters",
    title: context.t("queryBuilder.howItWorks.steps.parameters"),
    summary: context.t("queryBuilder.howItWorks.parameters.summary", {
      count: bullets.length,
    }),
    bullets,
    details: [
      {
        title: context.t("queryBuilder.parameters.label"),
        bullets,
      },
    ],
  };
}

function buildFiltersStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep | null {
  const bullets = formatFilterBullets(draft.filter, context);
  if (bullets.length === 0) {
    return null;
  }

  return {
    id: "filters",
    kind: "filter",
    icon: "filter",
    title: context.t("queryBuilder.howItWorks.steps.filters"),
    summary: context.t("queryBuilder.howItWorks.filters.summary", {
      count: countFilterConditions(draft.filter),
    }),
    bullets,
    details: [
      {
        title: context.t("queryBuilder.howItWorks.details.matchWhere"),
        bullets,
      },
    ],
  };
}

function buildSortStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep | null {
  const bullets = formatSortBullets(draft.sort, context);
  if (bullets.length === 0) {
    return null;
  }

  return {
    id: "sort",
    kind: "sort",
    icon: "sort",
    title: context.t("queryBuilder.howItWorks.steps.sort"),
    summary: context.t("queryBuilder.howItWorks.records.sortSummary", {
      count: bullets.length,
    }),
    bullets,
  };
}

function buildSelectStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep | null {
  if (draft.select.length === 0) {
    return null;
  }

  const fields = draft.select.map((field) =>
    context.fieldLabel(context.entityName, field),
  );

  return {
    id: "select",
    kind: "select",
    icon: "select",
    title: context.t("queryBuilder.howItWorks.steps.select"),
    summary: context.t("queryBuilder.howItWorks.records.selectSummary", {
      count: fields.length,
    }),
    bullets: fields,
  };
}

function buildLimitStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep {
  const summary =
    draft.limitMode === "topN"
      ? context.t("queryBuilder.howItWorks.records.limitTopN", {
          limit: draft.limit,
        })
      : context.t("queryBuilder.howItWorks.records.limitAll");

  return {
    id: "limit",
    kind: "limit",
    icon: "limit",
    title: context.t("queryBuilder.howItWorks.steps.limit"),
    summary,
  };
}

function buildGroupByStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep {
  const fields = draft.groupBy.map((field) =>
    context.fieldLabel(context.entityName, field),
  );

  return {
    id: "groupBy",
    kind: "groupBy",
    icon: "groupBy",
    title: context.t("queryBuilder.howItWorks.steps.groupBy"),
    summary:
      fields.length > 0
        ? context.t("queryBuilder.howItWorks.aggregated.groupBySummary", {
            fields: fields.join(", "),
          })
        : context.t("queryBuilder.groupBy.placeholder"),
    ...(fields.length > 0 ? { bullets: fields } : {}),
  };
}

function buildAggregationsStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep {
  const bullets = formatAggregationBullets(draft, context);

  return {
    id: "aggregations",
    kind: "aggregations",
    icon: "aggregations",
    title: context.t("queryBuilder.howItWorks.steps.aggregations"),
    summary:
      bullets.length > 0
        ? context.t("queryBuilder.howItWorks.aggregated.aggregationsSummary", {
            count: bullets.length,
          })
        : context.t("queryBuilder.aggregations.empty"),
    ...(bullets.length > 0 ? { bullets } : {}),
  };
}

function buildGroupSortStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep | null {
  const bullets = formatSortBullets(draft.groupSort, context);
  if (bullets.length === 0) {
    return null;
  }

  return {
    id: "groupSort",
    kind: "groupSort",
    icon: "groupSort",
    title: context.t("queryBuilder.howItWorks.steps.groupSort"),
    summary: context.t("queryBuilder.howItWorks.aggregated.groupSortSummary", {
      count: bullets.length,
    }),
    bullets,
  };
}

function buildGroupLimitStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep | null {
  if (draft.groupLimit === undefined) {
    return null;
  }

  return {
    id: "groupLimit",
    kind: "groupLimit",
    icon: "groupLimit",
    title: context.t("queryBuilder.howItWorks.steps.groupLimit"),
    summary: context.t("queryBuilder.howItWorks.aggregated.groupLimitSummary", {
      limit: draft.groupLimit,
    }),
  };
}

function buildOutputStep(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep {
  const summary =
    draft.queryMode === "aggregated"
      ? context.t("queryBuilder.howItWorks.output.aggregated")
      : context.t("queryBuilder.howItWorks.output.records");

  return {
    id: "output",
    kind: "output",
    icon: "output",
    title: context.t("queryBuilder.howItWorks.steps.output"),
    summary,
  };
}

function buildRecordsSteps(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep[] {
  const parametersStep = buildParametersStep(draft, context);
  const filtersStep = buildFiltersStep(draft, context);
  const sortStep = buildSortStep(draft, context);
  const selectStep = buildSelectStep(draft, context);

  return [
    buildSourceStep(context.entityName, context),
    ...(parametersStep ? [parametersStep] : []),
    ...(filtersStep ? [filtersStep] : []),
    ...(sortStep ? [sortStep] : []),
    ...(selectStep ? [selectStep] : []),
    buildLimitStep(draft, context),
    buildOutputStep(draft, context),
  ];
}

function buildAggregatedSteps(
  draft: EntityQueryDraftState,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewStep[] {
  const parametersStep = buildParametersStep(draft, context);
  const filtersStep = buildFiltersStep(draft, context);
  const groupSortStep = buildGroupSortStep(draft, context);
  const groupLimitStep = buildGroupLimitStep(draft, context);

  return [
    buildSourceStep(context.entityName, context),
    ...(parametersStep ? [parametersStep] : []),
    ...(filtersStep ? [filtersStep] : []),
    buildGroupByStep(draft, context),
    buildAggregationsStep(draft, context),
    ...(groupSortStep ? [groupSortStep] : []),
    ...(groupLimitStep ? [groupLimitStep] : []),
    buildOutputStep(draft, context),
  ];
}

export function buildEntityQueryPreviewModel(
  input: EntityQueryPreviewInput,
  context: EntityQueryPreviewBuildContext,
): EntityQueryPreviewModel {
  const filterCount = countFilterConditions(input.draft.filter);
  const steps =
    input.draft.queryMode === "aggregated"
      ? buildAggregatedSteps(input.draft, context)
      : buildRecordsSteps(input.draft, context);

  return {
    name: input.name,
    description: input.description,
    queryMode: input.draft.queryMode,
    steps,
    metaChips: buildMetaChips(input, context, filterCount),
  };
}

export function formatEntityQueryAdvancedPreview(
  input: EntityQueryPreviewInput,
  context: EntityQueryPreviewBuildContext,
): string {
  const { draft, sourceEntity } = input;
  const lines: string[] = [];

  lines.push(
    `sourceEntity: ${context.entityLabel(sourceEntity)}`,
    `queryMode: ${draft.queryMode}`,
  );

  const parameterBullets = formatParameterBullets(draft.parameters, context);
  if (parameterBullets.length > 0) {
    lines.push("parameters:");
    for (const line of parameterBullets) {
      lines.push(`  - ${line}`);
    }
  }

  const filterBullets = formatFilterBullets(draft.filter, context);
  if (filterBullets.length > 0) {
    lines.push("filters:");
    for (const line of filterBullets) {
      lines.push(`  ${line}`);
    }
  }

  if (draft.queryMode === "records") {
    const sortBullets = formatSortBullets(draft.sort, context);
    if (sortBullets.length > 0) {
      lines.push("sort:");
      for (const line of sortBullets) {
        lines.push(`  - ${line}`);
      }
    }
    if (draft.select.length > 0) {
      lines.push(`select: ${draft.select.join(", ")}`);
    }
    lines.push(
      draft.limitMode === "topN"
        ? `limit: top ${draft.limit}`
        : "limit: all (up to 500)",
    );
  } else {
    if (draft.groupBy.length > 0) {
      lines.push(`groupBy: ${draft.groupBy.join(", ")}`);
    }
    const aggregationBullets = formatAggregationBullets(draft, context);
    if (aggregationBullets.length > 0) {
      lines.push("aggregations:");
      for (const line of aggregationBullets) {
        lines.push(`  - ${line}`);
      }
    }
    const groupSortBullets = formatSortBullets(draft.groupSort, context);
    if (groupSortBullets.length > 0) {
      lines.push("groupSort:");
      for (const line of groupSortBullets) {
        lines.push(`  - ${line}`);
      }
    }
    if (draft.groupLimit !== undefined) {
      lines.push(`groupLimit: ${draft.groupLimit}`);
    }
  }

  lines.push(`status: ${draft.status}`);
  return lines.join("\n");
}
