import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { canReadMetricValues } from "@repo/rbac";

import type { MetricBindingSource } from "@repo/entities";
import type {
  MetricDerivedExpressionToken,
  MetricDerivedKpiComponentConfig,
} from "@repo/ui-builder-core";
import {
  evaluateDerivedExpression,
  extractMetricDefinitionIds,
  resolveMetricDerivedExpression,
  validateDerivedExpressionGrammar,
} from "@repo/ui-builder-core";

import { useAuth } from "../../auth/AuthContext.js";
import {
  MIN_DERIVED_METRIC_TERMS,
  validateDerivedMetricQueryShapes,
} from "../../components/metrics/metric-derived-utils.js";
import { readPrimaryMetricNumericValue } from "../../components/metrics/format-metric-display-value.js";
import {
  buildMetricRowQueryFromBindings,
  type MetricBindingContext,
} from "../../lib/metric-binding-resolution.js";
import {
  fetchMetricRowOrNull,
  type MetricDefinitionRecord,
} from "../../lib/api-client.js";
import { metricRowQueryKey } from "../../query/query-client.js";
import { resolveMetricDefinitionDocumentId } from "../../lib/resolve-metric-definition-reference.js";
import { useActiveMetricDefinitions } from "./useActiveMetricDefinitions.js";

type MetricDerivedValueStatus =
  | "unconfigured"
  | "invalidExpression"
  | "loading"
  | "forbidden"
  | "error"
  | "shapeMismatch"
  | "divideByZero"
  | "empty"
  | "ready";

function resolveDerivedReadAccess(input: {
  readonly isSessionResolved: boolean;
  readonly isSuperAdmin: boolean;
  readonly permissions: readonly string[];
  readonly sourceModels: readonly (string | undefined)[];
  readonly definitionsLoaded: boolean;
}): "pending" | "allowed" | "denied" {
  if (!input.isSessionResolved || !input.definitionsLoaded) {
    return "pending";
  }

  const models = input.sourceModels.filter((model): model is string =>
    Boolean(model?.trim()),
  );

  if (models.length !== input.sourceModels.length) {
    return "pending";
  }

  return models.every((model) =>
    canReadMetricValues(model, input.permissions, {
      isSuperAdmin: input.isSuperAdmin,
    }),
  )
    ? "allowed"
    : "denied";
}

export function useMetricDerivedValue(input: {
  readonly expression: readonly MetricDerivedExpressionToken[];
  readonly terms?: MetricDerivedKpiComponentConfig["terms"];
  readonly groupBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly dimensionBindings: Readonly<Record<string, MetricBindingSource>>;
  readonly context?: MetricBindingContext;
}) {
  const { isSuperAdmin, permissions, isSessionResolved } = useAuth();

  const { expression, terms } = input;

  const resolvedExpression = useMemo(
    () => resolveMetricDerivedExpression({ expression, terms }),
    [expression, terms],
  );

  const configuredMetricIds = useMemo(
    () => extractMetricDefinitionIds(resolvedExpression),
    [resolvedExpression],
  );

  const grammarError = useMemo(
    () => validateDerivedExpressionGrammar(resolvedExpression),
    [resolvedExpression],
  );

  const activeDefinitionsQuery = useActiveMetricDefinitions(
    configuredMetricIds.length > 0,
  );

  const resolvedMetrics = useMemo(() => {
    const definitions = activeDefinitionsQuery.data ?? [];
    return configuredMetricIds.map((metricDefinitionId) => {
      const definitionId = resolveMetricDefinitionDocumentId(
        metricDefinitionId,
        definitions,
      );
      return {
        metricDefinitionId,
        definitionId,
        definition: definitions.find((item) => item.id === definitionId),
      };
    });
  }, [activeDefinitionsQuery.data, configuredMetricIds]);

  const definitions = useMemo(
    () =>
      resolvedMetrics
        .map((entry) => entry.definition)
        .filter((item): item is MetricDefinitionRecord => item !== undefined),
    [resolvedMetrics],
  );

  const shapeMismatch = useMemo(() => {
    if (definitions.length < MIN_DERIVED_METRIC_TERMS) {
      return null;
    }
    return validateDerivedMetricQueryShapes(definitions);
  }, [definitions]);

  const primaryDefinition = definitions[0];
  const resolvedQuery = useMemo(() => {
    if (!primaryDefinition || shapeMismatch) {
      return null;
    }

    try {
      return buildMetricRowQueryFromBindings(
        primaryDefinition,
        {
          groupBindings: input.groupBindings,
          dimensionBindings: input.dimensionBindings,
        },
        input.context ?? {},
      );
    } catch {
      return null;
    }
  }, [
    input.context,
    input.dimensionBindings,
    input.groupBindings,
    primaryDefinition,
    shapeMismatch,
  ]);

  const readAccess = resolveDerivedReadAccess({
    isSessionResolved,
    isSuperAdmin,
    permissions,
    sourceModels: resolvedMetrics.map((entry) => entry.definition?.sourceModel),
    definitionsLoaded: activeDefinitionsQuery.isFetched,
  });

  const rowQueriesEnabled =
    configuredMetricIds.length >= MIN_DERIVED_METRIC_TERMS &&
    grammarError === null &&
    !shapeMismatch &&
    readAccess === "allowed" &&
    resolvedQuery !== null &&
    activeDefinitionsQuery.isSuccess;

  const rowQueries = useQueries({
    queries: resolvedMetrics.map((entry) => ({
      queryKey: metricRowQueryKey(entry.definitionId ?? "", resolvedQuery),
      queryFn: () => fetchMetricRowOrNull(entry.definitionId!, resolvedQuery!),
      enabled:
        rowQueriesEnabled &&
        Boolean(entry.definitionId) &&
        Boolean(entry.definition),
    })),
  });

  const displayDefinition = primaryDefinition;

  const evaluation = useMemo(() => {
    if (grammarError) {
      return { value: null, error: "invalidExpression" as const };
    }

    if (configuredMetricIds.length === 0) {
      return { value: null, error: "insufficientMetrics" as const };
    }

    const valueByMetricId = new Map<string, number | null>();
    resolvedMetrics.forEach((entry, index) => {
      const definition = entry.definition;
      const row = rowQueries[index]?.data;
      if (!definition) {
        valueByMetricId.set(entry.metricDefinitionId, null);
        return;
      }
      valueByMetricId.set(
        entry.metricDefinitionId,
        readPrimaryMetricNumericValue(definition, row?.values),
      );
    });

    return evaluateDerivedExpression({
      tokens: resolvedExpression,
      resolveMetricValue: (metricDefinitionId) =>
        valueByMetricId.get(metricDefinitionId.trim()) ?? null,
    });
  }, [
    configuredMetricIds.length,
    grammarError,
    resolvedExpression,
    resolvedMetrics,
    rowQueries,
  ]);

  const total = evaluation.value;
  const evaluationError = evaluation.error;

  const isLoading =
    activeDefinitionsQuery.isLoading ||
    readAccess === "pending" ||
    (rowQueriesEnabled && rowQueries.some((query) => query.isLoading));

  const isError =
    activeDefinitionsQuery.isError || rowQueries.some((query) => query.isError);

  const status: MetricDerivedValueStatus = useMemo(() => {
    if (configuredMetricIds.length === 0) {
      return "unconfigured";
    }
    if (grammarError) {
      return "invalidExpression";
    }
    if (isLoading) {
      return "loading";
    }
    if (readAccess === "denied") {
      return "forbidden";
    }
    if (shapeMismatch) {
      return "shapeMismatch";
    }
    if (isError) {
      return "error";
    }
    if (evaluationError === "divideByZero") {
      return "divideByZero";
    }
    if (evaluationError === "invalidExpression") {
      return "invalidExpression";
    }
    if (total === null) {
      return "empty";
    }
    return "ready";
  }, [
    configuredMetricIds.length,
    evaluationError,
    grammarError,
    isError,
    isLoading,
    readAccess,
    shapeMismatch,
    total,
  ]);

  return {
    status,
    total,
    displayDefinition,
    shapeMismatch,
    grammarError,
    isLoading,
    expression: resolvedExpression,
  };
}
