import type { EntityQueryParameter } from "@repo/entity-queries";
import type { FilterBindingSource } from "@repo/entities";
import type { MetricDateGranularity } from "@repo/metrics-engine/browser";
import type {
  ChartDataSource,
  ResolvedChartComponentConfig,
} from "@repo/ui-builder-core";
import { defaultDateFilterParam } from "@repo/ui-builder-core";

import type {
  EntityQueryDefinitionRecord,
  MetricDefinitionRecord,
} from "../../lib/api-client.js";
import type { PageFilterContext } from "../../lib/metric-binding-resolution.js";
import { getCurrentDateBucket } from "../ui-builder/use-dashboard-date-filter-url-state.js";
import type { ChartDefinitionDraft } from "./chart-definition-draft.js";

export type ChartPreviewInputField =
  | {
      readonly kind: "dashboardDate";
      readonly key: "dashboardDate";
      readonly granularity: MetricDateGranularity;
      readonly param: string;
      readonly label: string;
    }
  | {
      readonly kind: "dateBucket";
      readonly key: string;
      readonly granularity: MetricDateGranularity;
      readonly label: string;
    }
  | {
      readonly kind: "stringList";
      readonly key: string;
      readonly label: string;
    }
  | {
      readonly kind: "scalar";
      readonly key: string;
      readonly label: string;
    };

function readStaticBindingValue(
  binding: FilterBindingSource | undefined,
): string | undefined {
  if (binding?.type !== "static") {
    return undefined;
  }
  if (Array.isArray(binding.value)) {
    return binding.value.map(String).join(", ");
  }
  return String(binding.value);
}

function collectRowFilterValues(
  dataSource: Extract<ChartDataSource, { type: "entityQuery" }>,
): readonly string[] {
  const values = new Set<string>();
  for (const filter of dataSource.timeSeries?.rowFilters ?? []) {
    if (Array.isArray(filter.whenValue)) {
      for (const entry of filter.whenValue) {
        values.add(String(entry));
      }
    } else if (filter.whenValue !== undefined) {
      values.add(String(filter.whenValue));
    }
  }
  for (const transform of dataSource.timeSeries?.valueTransforms ?? []) {
    if (Array.isArray(transform.whenValue)) {
      for (const entry of transform.whenValue) {
        values.add(String(entry));
      }
    } else if (transform.whenValue !== undefined) {
      values.add(String(transform.whenValue));
    }
  }
  return [...values];
}

function appendParameterField(
  fields: ChartPreviewInputField[],
  parameter: EntityQueryParameter,
): void {
  switch (parameter.valueType) {
    case "dateBucket":
      fields.push({
        kind: "dateBucket",
        key: parameter.name,
        granularity: parameter.granularity ?? "month",
        label: parameter.name,
      });
      break;
    case "stringList":
      fields.push({
        kind: "stringList",
        key: parameter.name,
        label: parameter.name,
      });
      break;
    case "scalar":
      fields.push({
        kind: "scalar",
        key: parameter.name,
        label: parameter.name,
      });
      break;
  }
}

export function resolveChartPreviewInputFields(
  draft: ChartDefinitionDraft,
  entityQueryDefinition?: EntityQueryDefinitionRecord,
  metricDefinition?: MetricDefinitionRecord,
): readonly ChartPreviewInputField[] {
  const dataSource = draft.dataSource;

  if (dataSource.type === "static") {
    return [];
  }

  if (dataSource.type === "metricSeries") {
    const usesComputedParameter =
      metricDefinition?.computationMode === "computed" &&
      metricDefinition.parameters?.some(
        (parameter) =>
          !parameter.deriveFrom && parameter.name === dataSource.dimensionField,
      );

    return [
      {
        kind: "dashboardDate",
        key: "dashboardDate",
        granularity: dataSource.step.unit,
        param: usesComputedParameter
          ? dataSource.dimensionField
          : defaultDateFilterParam(dataSource.step.unit),
        label: dataSource.dimensionField,
      },
    ];
  }

  if (dataSource.type !== "entityQuery" || !entityQueryDefinition) {
    return [];
  }

  const fields: ChartPreviewInputField[] = [];
  const periodParameter = dataSource.timeSeries?.periodParameter;

  if (dataSource.timeSeries && periodParameter) {
    const periodDefinition = entityQueryDefinition.parameters?.find(
      (parameter) => parameter.name === periodParameter,
    );
    fields.push({
      kind: "dashboardDate",
      key: "dashboardDate",
      granularity:
        periodDefinition?.granularity ?? dataSource.timeSeries.step.unit,
      param: periodParameter,
      label: periodParameter,
    });
  }

  for (const parameter of entityQueryDefinition.parameters ?? []) {
    if (
      periodParameter &&
      parameter.name === periodParameter &&
      dataSource.timeSeries
    ) {
      continue;
    }
    appendParameterField(fields, parameter);
  }

  return fields;
}

export function createDefaultPreviewInputValues(
  fields: readonly ChartPreviewInputField[],
  draft: ChartDefinitionDraft,
): Record<string, string> {
  const values: Record<string, string> = {};
  const bindings =
    draft.dataSource.type === "static"
      ? undefined
      : draft.dataSource.parameterBindings;

  for (const field of fields) {
    if (field.kind === "dashboardDate") {
      values[field.key] = getCurrentDateBucket(field.granularity);
      continue;
    }

    const staticValue = readStaticBindingValue(bindings?.[field.key]);
    if (staticValue !== undefined) {
      values[field.key] = staticValue;
      continue;
    }

    if (
      field.kind === "stringList" &&
      draft.dataSource.type === "entityQuery"
    ) {
      values[field.key] = collectRowFilterValues(draft.dataSource).join(", ");
      continue;
    }

    values[field.key] = "";
  }

  return values;
}

function parseStringListValue(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildPreviewParameterBindings(
  dataSource: Extract<
    ChartDataSource,
    { type: "entityQuery" | "metricSeries" }
  >,
  fields: readonly ChartPreviewInputField[],
  values: Record<string, string>,
): Readonly<Record<string, FilterBindingSource>> {
  const bindings: Record<string, FilterBindingSource> = {
    ...(dataSource.parameterBindings ?? {}),
  };

  for (const field of fields) {
    if (field.kind === "dashboardDate") {
      continue;
    }

    const raw = values[field.key]?.trim() ?? "";
    if (!raw) {
      continue;
    }

    if (field.kind === "stringList") {
      bindings[field.key] = {
        type: "static",
        value: parseStringListValue(raw),
      };
      continue;
    }

    bindings[field.key] = { type: "static", value: raw };
  }

  return bindings;
}

export function buildChartPreviewRuntime(
  draft: ChartDefinitionDraft,
  resolvedConfig: ResolvedChartComponentConfig,
  fields: readonly ChartPreviewInputField[],
  values: Record<string, string>,
): {
  readonly context: PageFilterContext;
  readonly config: ResolvedChartComponentConfig;
} {
  const dashboardField = fields.find((field) => field.kind === "dashboardDate");
  const context: PageFilterContext = dashboardField
    ? {
        dashboardDateFilter: {
          value:
            values[dashboardField.key]?.trim() ||
            getCurrentDateBucket(dashboardField.granularity),
          granularity: dashboardField.granularity,
          param: dashboardField.param,
        },
      }
    : {};

  if (
    draft.dataSource.type === "entityQuery" ||
    draft.dataSource.type === "metricSeries"
  ) {
    const parameterBindings = buildPreviewParameterBindings(
      draft.dataSource,
      fields,
      values,
    );

    if (resolvedConfig.dataSource.type === "entityQuery") {
      return {
        context,
        config: {
          ...resolvedConfig,
          dataSource: {
            ...resolvedConfig.dataSource,
            parameterBindings,
          },
        },
      };
    }

    if (resolvedConfig.dataSource.type === "metricSeries") {
      return {
        context,
        config: {
          ...resolvedConfig,
          dataSource: {
            ...resolvedConfig.dataSource,
            parameterBindings,
          },
        },
      };
    }
  }

  return { context, config: resolvedConfig };
}

export function areChartPreviewInputsComplete(
  fields: readonly ChartPreviewInputField[],
  values: Record<string, string>,
): boolean {
  for (const field of fields) {
    if (field.kind === "dashboardDate") {
      if (!(values[field.key]?.trim().length ?? 0)) {
        return false;
      }
      continue;
    }

    if (!(values[field.key]?.trim().length ?? 0)) {
      return false;
    }
  }

  return true;
}
