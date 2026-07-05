import type {
  ComputedMetricComputation,
  ComputedMetricInputRef,
  MetricDefinitionParameter,
} from "@repo/metrics-engine/browser";
import { Text } from "@repo/ui";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  EntityQueryDefinitionRecord,
  MetricDefinitionRecord,
} from "../../lib/api-client.js";
import {
  formatMetricDefinitionOptionLabel,
  resolveMetricDefinitionDocumentId,
} from "../../lib/resolve-metric-definition-reference.js";

interface MetricComputationPreviewProps {
  readonly parameters: readonly MetricDefinitionParameter[];
  readonly computation: ComputedMetricComputation;
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
  readonly queryDefinitions: readonly EntityQueryDefinitionRecord[];
  readonly showTitle?: boolean;
}

const OPERATOR_SYMBOLS: Readonly<Record<"+" | "-" | "*" | "/", string>> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

function formatParameterMap(
  parameterMap: Readonly<Record<string, string>>,
): string {
  const entries = Object.entries(parameterMap)
    .filter(([field, parameter]) => field.trim() && parameter.trim())
    .map(([field, parameter]) => `${field} → ${parameter}`);
  return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{ }";
}

function formatInputRefPreview(
  inputRef: ComputedMetricInputRef,
  resolveMetricLabel: (id: string) => string,
  resolveQueryLabel: (id: string) => string,
): string {
  if (inputRef.type === "metricRef") {
    const metricLabel = inputRef.metricDefinitionId.trim()
      ? resolveMetricLabel(inputRef.metricDefinitionId)
      : "?";
    return `metric(${metricLabel}, ${formatParameterMap(inputRef.parameterMap)})`;
  }

  const queryLabel = inputRef.queryDefinitionId.trim()
    ? resolveQueryLabel(inputRef.queryDefinitionId)
    : "?";
  const operation = inputRef.aggregationOperation ?? "SUM";
  const field =
    operation === "COUNT"
      ? ""
      : inputRef.aggregationField?.trim()
        ? `.${inputRef.aggregationField.trim()}`
        : ".?";
  return `query(${queryLabel}, ${operation}${field}, ${formatParameterMap(inputRef.parameterMap)})`;
}

function formatExpressionTokens(
  computation: Extract<ComputedMetricComputation, { type: "expression" }>,
): string {
  return computation.tokens
    .map((token) => {
      switch (token.type) {
        case "input":
          return token.name.trim() || "?";
        case "operator":
          return ` ${OPERATOR_SYMBOLS[token.op]} `;
        case "literal":
          return String(token.value);
      }
    })
    .join("")
    .trim();
}

function formatComputationPreview(
  computation: ComputedMetricComputation,
  resolveMetricLabel: (id: string) => string,
  resolveQueryLabel: (id: string) => string,
  labels: {
    readonly current: string;
    readonly baseline: string;
    readonly numerator: string;
    readonly denominator: string;
    readonly percentChange: string;
    readonly difference: string;
    readonly ratio: string;
    readonly expression: string;
    readonly inputs: string;
  },
): string {
  switch (computation.type) {
    case "percentChange":
      return `${labels.percentChange}(\n  ${labels.current}: ${formatInputRefPreview(computation.current, resolveMetricLabel, resolveQueryLabel)},\n  ${labels.baseline}: ${formatInputRefPreview(computation.baseline, resolveMetricLabel, resolveQueryLabel)}\n)`;
    case "difference":
      return `${labels.difference}(\n  ${labels.current}: ${formatInputRefPreview(computation.current, resolveMetricLabel, resolveQueryLabel)},\n  ${labels.baseline}: ${formatInputRefPreview(computation.baseline, resolveMetricLabel, resolveQueryLabel)}\n)`;
    case "ratio":
      return `${labels.ratio}(\n  ${labels.numerator}: ${formatInputRefPreview(computation.numerator, resolveMetricLabel, resolveQueryLabel)},\n  ${labels.denominator}: ${formatInputRefPreview(computation.denominator, resolveMetricLabel, resolveQueryLabel)}\n)`;
    case "expression": {
      const inputLines = Object.entries(computation.inputs).map(
        ([name, inputRef]) =>
          `  ${name}: ${formatInputRefPreview(inputRef, resolveMetricLabel, resolveQueryLabel)}`,
      );
      const formula = formatExpressionTokens(computation);
      return `${labels.expression}(\n${labels.inputs}:\n${inputLines.join("\n")}\n)\n= ${formula || "?"}`;
    }
  }
}

function formatParametersPreview(
  parameters: readonly MetricDefinitionParameter[],
  labels: {
    readonly none: string;
    readonly deriveFrom: string;
    readonly shift: string;
  },
): string {
  if (parameters.length === 0) {
    return labels.none;
  }

  return parameters
    .map((parameter) => {
      const name = parameter.name.trim() || "?";
      const typeLabel =
        parameter.valueType === "dateBucket" && parameter.granularity
          ? `${parameter.valueType}(${parameter.granularity})`
          : parameter.valueType;
      if (parameter.deriveFrom) {
        return `${name}: ${typeLabel}, ${labels.deriveFrom} ${parameter.deriveFrom.parameter}, ${labels.shift} ${parameter.deriveFrom.shift.offset} ${parameter.deriveFrom.shift.unit}`;
      }
      return `${name}: ${typeLabel}`;
    })
    .join("\n");
}

export function MetricComputationPreview({
  parameters,
  computation,
  metricDefinitions,
  queryDefinitions,
  showTitle = true,
}: MetricComputationPreviewProps) {
  const { t } = useTranslation("common");

  const metricLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const definition of metricDefinitions) {
      const label = formatMetricDefinitionOptionLabel(definition);
      labels.set(definition.id, label);
      labels.set(definition.metricId, label);
      labels.set(definition.name, label);
    }
    return labels;
  }, [metricDefinitions]);

  const resolveMetricLabel = useCallback(
    (metricDefinitionId: string) => {
      const resolvedId = resolveMetricDefinitionDocumentId(
        metricDefinitionId,
        metricDefinitions,
      );
      if (resolvedId) {
        return metricLabelById.get(resolvedId) ?? metricDefinitionId;
      }
      return metricLabelById.get(metricDefinitionId) ?? metricDefinitionId;
    },
    [metricDefinitions, metricLabelById],
  );

  const queryLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const query of queryDefinitions) {
      labels.set(query.id, `${query.name} (${query.sourceEntity})`);
    }
    return labels;
  }, [queryDefinitions]);

  const previewText = useMemo(() => {
    const parameterSection = formatParametersPreview(parameters, {
      none: t("metrics.computed.preview.noParameters", {
        defaultValue: "(none)",
      }),
      deriveFrom: t("metrics.computed.preview.deriveFrom", {
        defaultValue: "derive from",
      }),
      shift: t("metrics.computed.preview.shift", {
        defaultValue: "shift",
      }),
    });

    const computationSection = formatComputationPreview(
      computation,
      resolveMetricLabel,
      (id) => queryLabelById.get(id) ?? id,
      {
        current: t("metrics.computed.computation.current", {
          defaultValue: "current",
        }),
        baseline: t("metrics.computed.computation.baseline", {
          defaultValue: "baseline",
        }),
        numerator: t("metrics.computed.computation.numerator", {
          defaultValue: "numerator",
        }),
        denominator: t("metrics.computed.computation.denominator", {
          defaultValue: "denominator",
        }),
        percentChange: t("metrics.computed.computation.types.percentChange", {
          defaultValue: "percentChange",
        }),
        difference: t("metrics.computed.computation.types.difference", {
          defaultValue: "difference",
        }),
        ratio: t("metrics.computed.computation.types.ratio", {
          defaultValue: "ratio",
        }),
        expression: t("metrics.computed.computation.types.expression", {
          defaultValue: "expression",
        }),
        inputs: t("metrics.computed.computation.expressionInputs", {
          defaultValue: "inputs",
        }),
      },
    );

    return `${t("metrics.computed.preview.parametersHeading", {
      defaultValue: "Parameters",
    })}\n${parameterSection}\n\n${t(
      "metrics.computed.preview.computationHeading",
      {
        defaultValue: "Computation",
      },
    )}\n${computationSection}`;
  }, [computation, parameters, queryLabelById, resolveMetricLabel, t]);

  const isSingleLine = !previewText.includes("\n");

  return (
    <div className="space-y-2">
      {showTitle ? (
        <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("metrics.computed.preview.title", {
            defaultValue: "Computation preview",
          })}
        </Text>
      ) : null}
      <pre
        className={`bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-xs ${isSingleLine ? "whitespace-pre" : "whitespace-pre-wrap"}`}
      >
        {previewText}
      </pre>
    </div>
  );
}

export { formatComputationPreview, formatParametersPreview };
