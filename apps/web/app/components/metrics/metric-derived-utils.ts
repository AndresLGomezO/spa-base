import type { MetricDefinitionRecord } from "../../lib/api-client.js";
import { MIN_DERIVED_METRIC_EXPRESSION_METRICS } from "@repo/ui-builder-core";

export {
  evaluateDerivedExpression,
  extractMetricDefinitionIds,
  migrateLegacyDerivedTerms,
} from "@repo/ui-builder-core";

export const MIN_DERIVED_METRIC_TERMS = MIN_DERIVED_METRIC_EXPRESSION_METRICS;

interface MetricQueryShape {
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
}

function metricDefinitionQueryShape(
  definition: Pick<MetricDefinitionRecord, "groupBy" | "dimensions">,
): MetricQueryShape {
  return {
    groupBy: [...definition.groupBy].sort(),
    dimensions: [...definition.dimensions].sort(),
  };
}

function metricQueryShapesMatch(
  left: MetricQueryShape,
  right: MetricQueryShape,
): boolean {
  return (
    left.groupBy.join("\0") === right.groupBy.join("\0") &&
    left.dimensions.join("\0") === right.dimensions.join("\0")
  );
}

export function validateDerivedMetricQueryShapes(
  definitions: readonly MetricDefinitionRecord[],
): string | null {
  if (definitions.length < MIN_DERIVED_METRIC_EXPRESSION_METRICS) {
    return "insufficientTerms";
  }

  const reference = metricDefinitionQueryShape(definitions[0]!);
  for (const definition of definitions.slice(1)) {
    if (
      !metricQueryShapesMatch(reference, metricDefinitionQueryShape(definition))
    ) {
      return definition.name;
    }
  }

  return null;
}
