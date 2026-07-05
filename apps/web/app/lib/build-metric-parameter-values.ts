import { resolveFilterBindingMap } from "./metric-binding-resolution.js";
import type { PageFilterContext } from "./metric-binding-resolution.js";
import type { MetricDefinitionRecord } from "./api-client.js";
import type { FilterBindingSource } from "@repo/entities";

export function buildMetricParameterValuesFromBindings(
  definition: MetricDefinitionRecord,
  parameterBindings: Readonly<Record<string, FilterBindingSource>>,
  context: PageFilterContext,
): Record<string, string | number | boolean> | null {
  const requiredParameters =
    definition.parameters?.filter((parameter) => !parameter.deriveFrom) ?? [];
  if (requiredParameters.length === 0) {
    return {};
  }

  const granularityMap = Object.fromEntries(
    requiredParameters
      .filter((parameter) => parameter.granularity)
      .map((parameter) => [parameter.name, parameter.granularity!]),
  );

  for (const parameter of requiredParameters) {
    if (!(parameter.name in parameterBindings)) {
      return null;
    }
  }

  return resolveFilterBindingMap(parameterBindings, context, {
    dateFieldGranularity: granularityMap,
  });
}
