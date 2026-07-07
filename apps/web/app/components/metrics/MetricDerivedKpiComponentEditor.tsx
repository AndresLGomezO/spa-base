import type {
  MetricDerivedExpressionToken,
  MetricDerivedKpiComponentConfig,
  MetricDerivedOperator,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import {
  MAX_DERIVED_EXPRESSION_TOKENS,
  validateDerivedExpressionGrammar,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import { useAnyPermission } from "../../auth/useAnyPermission.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import {
  formatMetricDefinitionOptionLabel,
  resolveMetricDefinitionDocumentId,
} from "../../lib/resolve-metric-definition-reference.js";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions.js";
import {
  extractMetricDefinitionIds,
  MIN_DERIVED_METRIC_TERMS,
  validateDerivedMetricQueryShapes,
} from "./metric-derived-utils.js";
import { formatMetricDerivedExpressionPreview } from "./metric-derived-expression-preview.js";
import { MetricBindingsEditor } from "./MetricBindingsEditor.js";

interface MetricDerivedKpiComponentEditorProps {
  readonly config: MetricDerivedKpiComponentConfig;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (config: UiComponentConfig) => void;
}

const OPERATOR_OPTIONS: readonly MetricDerivedOperator[] = ["+", "-", "*", "/"];

function moveToken(
  expression: readonly MetricDerivedExpressionToken[],
  index: number,
  direction: -1 | 1,
): readonly MetricDerivedExpressionToken[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= expression.length) {
    return expression;
  }

  const next = [...expression];
  const current = next[index];
  next[index] = next[targetIndex]!;
  next[targetIndex] = current!;
  return next;
}

function updateToken(
  expression: readonly MetricDerivedExpressionToken[],
  index: number,
  token: MetricDerivedExpressionToken,
): readonly MetricDerivedExpressionToken[] {
  return expression.map((item, itemIndex) =>
    itemIndex === index ? token : item,
  );
}

function removeToken(
  expression: readonly MetricDerivedExpressionToken[],
  index: number,
): readonly MetricDerivedExpressionToken[] {
  return expression.filter((_, itemIndex) => itemIndex !== index);
}

function appendToken(
  expression: readonly MetricDerivedExpressionToken[],
  token: MetricDerivedExpressionToken,
): readonly MetricDerivedExpressionToken[] {
  if (expression.length >= MAX_DERIVED_EXPRESSION_TOKENS) {
    return expression;
  }
  return [...expression, token];
}

export function MetricDerivedKpiComponentEditor({
  config,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: MetricDerivedKpiComponentEditorProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const canConfigureWidgets = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  const definitionsQuery = useActiveMetricDefinitions(canConfigureWidgets);
  const expression = config.expression;

  const definitions = useMemo(
    () => definitionsQuery.data ?? [],
    [definitionsQuery.data],
  );

  const metricOptions = useMemo(
    () =>
      [...definitions].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [definitions],
  );

  const metricLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const definition of definitions) {
      labels.set(definition.id, formatMetricDefinitionOptionLabel(definition));
    }
    return labels;
  }, [definitions]);

  const configuredMetricIds = useMemo(
    () => extractMetricDefinitionIds(expression),
    [expression],
  );

  const resolvedDefinitions = useMemo(
    () =>
      configuredMetricIds
        .map((metricDefinitionId) => {
          const definitionId = resolveMetricDefinitionDocumentId(
            metricDefinitionId,
            definitions,
          );
          return definitions.find((item) => item.id === definitionId);
        })
        .filter((item): item is NonNullable<typeof item> => item !== undefined),
    [configuredMetricIds, definitions],
  );

  const grammarError = useMemo(
    () => validateDerivedExpressionGrammar(expression),
    [expression],
  );

  const shapeMismatchName = useMemo(() => {
    if (resolvedDefinitions.length < MIN_DERIVED_METRIC_TERMS) {
      return null;
    }
    const result = validateDerivedMetricQueryShapes(resolvedDefinitions);
    return result === "insufficientTerms" ? null : result;
  }, [resolvedDefinitions]);

  const primaryDefinition = resolvedDefinitions[0];

  const bindingEntityDefinition = useMemo(() => {
    if (!primaryDefinition) {
      return entityDefinition;
    }

    return (
      entities.find(
        (entity) => entity.name === primaryDefinition.sourceModel,
      ) ?? entityDefinition
    );
  }, [entities, entityDefinition, primaryDefinition]);

  const bindingFilterFieldOptions = useMemo(
    () =>
      bindingEntityDefinition === entityDefinition
        ? filterFieldOptions
        : Object.keys(bindingEntityDefinition.fields).filter(
            (field) =>
              bindingEntityDefinition.fields[field]?.type !== "document",
          ),
    [bindingEntityDefinition, entityDefinition, filterFieldOptions],
  );

  const formulaPreview = useMemo(
    () =>
      formatMetricDerivedExpressionPreview(expression, (metricDefinitionId) => {
        const definitionId = resolveMetricDefinitionDocumentId(
          metricDefinitionId,
          definitions,
        );
        return (
          (metricLabelById.get(definitionId ?? "") ??
            metricDefinitionId.trim()) ||
          t("metrics.derivedKpi.unnamedMetric")
        );
      }),
    [definitions, expression, metricLabelById, t],
  );

  const updateExpression = (
    nextExpression: readonly MetricDerivedExpressionToken[],
  ) => {
    onChange({
      ...config,
      expression: nextExpression,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.label")}
        </span>
        <input
          value={config.label ?? ""}
          onChange={(event) =>
            onChange({
              ...config,
              label: event.target.value.trim() || undefined,
            })
          }
        />
      </label>

      <div className="flex flex-col gap-2">
        <Text className="text-muted-foreground text-xs">
          {t("metrics.derivedKpi.formulaPreview")}
        </Text>
        <Text className="font-mono text-sm">{formulaPreview || "—"}</Text>
      </div>

      <div className="flex flex-col gap-2">
        <Text className="text-muted-foreground text-xs">
          {t("metrics.derivedKpi.expressionTitle")}
        </Text>

        {expression.map((token, index) => (
          <div
            key={`derived-token-${index}`}
            className="border-border flex flex-col gap-2 rounded-md border p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <Text className="text-muted-foreground text-xs">
                {t("metrics.derivedKpi.tokenLabel", { index: index + 1 })}
              </Text>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() =>
                    updateExpression(moveToken(expression, index, -1))
                  }
                >
                  {t("metrics.derivedKpi.moveTokenUp")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === expression.length - 1}
                  onClick={() =>
                    updateExpression(moveToken(expression, index, 1))
                  }
                >
                  {t("metrics.derivedKpi.moveTokenDown")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateExpression(removeToken(expression, index))
                  }
                >
                  {t("metrics.derivedKpi.removeToken")}
                </Button>
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                {t("metrics.derivedKpi.tokenType")}
              </span>
              <Select
                value={token.type}
                onChange={(event) => {
                  const nextType = event.target
                    .value as MetricDerivedExpressionToken["type"];
                  if (nextType === "metric") {
                    updateExpression(
                      updateToken(expression, index, {
                        type: "metric",
                        metricDefinitionId: "",
                      }),
                    );
                    return;
                  }
                  if (nextType === "constant") {
                    updateExpression(
                      updateToken(expression, index, {
                        type: "constant",
                        value: 1,
                      }),
                    );
                    return;
                  }
                  if (nextType === "operator") {
                    updateExpression(
                      updateToken(expression, index, {
                        type: "operator",
                        op: "+",
                      }),
                    );
                    return;
                  }
                  updateExpression(
                    updateToken(expression, index, {
                      type: "paren",
                      side: "open",
                    }),
                  );
                }}
              >
                <option value="metric">
                  {t("metrics.derivedKpi.tokenTypes.metric")}
                </option>
                <option value="constant">
                  {t("metrics.derivedKpi.tokenTypes.constant")}
                </option>
                <option value="operator">
                  {t("metrics.derivedKpi.tokenTypes.operator")}
                </option>
                <option value="paren">
                  {t("metrics.derivedKpi.tokenTypes.paren")}
                </option>
              </Select>
            </label>

            {token.type === "metric" ? (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {t("entity.viewSettings.metrics.definition")}
                </span>
                <Select
                  value={
                    resolveMetricDefinitionDocumentId(
                      token.metricDefinitionId,
                      definitions,
                    ) ?? ""
                  }
                  onChange={(event) =>
                    updateExpression(
                      updateToken(expression, index, {
                        ...token,
                        metricDefinitionId: event.target.value,
                      }),
                    )
                  }
                >
                  <option value="">
                    {t("entity.viewSettings.metrics.selectMetric")}
                  </option>
                  {metricOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatMetricDefinitionOptionLabel(item)}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}

            {token.type === "constant" ? (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {t("metrics.derivedKpi.constantValue")}
                </span>
                <Input
                  type="number"
                  step="any"
                  value={String(token.value)}
                  placeholder={t("metrics.derivedKpi.constantPlaceholder")}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) {
                      return;
                    }
                    updateExpression(
                      updateToken(expression, index, {
                        ...token,
                        value: parsed,
                      }),
                    );
                  }}
                />
              </label>
            ) : null}

            {token.type === "operator" ? (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {t("metrics.derivedKpi.operator")}
                </span>
                <Select
                  value={token.op}
                  onChange={(event) =>
                    updateExpression(
                      updateToken(expression, index, {
                        ...token,
                        op: event.target.value as MetricDerivedOperator,
                      }),
                    )
                  }
                >
                  {OPERATOR_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`metrics.derivedKpi.operators.${option}`)}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}

            {token.type === "paren" ? (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {t("metrics.derivedKpi.parenthesis")}
                </span>
                <Select
                  value={token.side}
                  onChange={(event) =>
                    updateExpression(
                      updateToken(expression, index, {
                        ...token,
                        side: event.target.value as "open" | "close",
                      }),
                    )
                  }
                >
                  <option value="open">
                    {t("metrics.derivedKpi.parenthesisOpen")}
                  </option>
                  <option value="close">
                    {t("metrics.derivedKpi.parenthesisClose")}
                  </option>
                </Select>
              </label>
            ) : null}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={expression.length >= MAX_DERIVED_EXPRESSION_TOKENS}
            onClick={() =>
              updateExpression(
                appendToken(expression, {
                  type: "metric",
                  metricDefinitionId: "",
                }),
              )
            }
          >
            {t("metrics.derivedKpi.insertMetric")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={expression.length >= MAX_DERIVED_EXPRESSION_TOKENS}
            onClick={() =>
              updateExpression(
                appendToken(expression, { type: "constant", value: 1 }),
              )
            }
          >
            {t("metrics.derivedKpi.insertConstant")}
          </Button>
          {OPERATOR_OPTIONS.map((operator) => (
            <Button
              key={operator}
              type="button"
              variant="outline"
              size="sm"
              disabled={expression.length >= MAX_DERIVED_EXPRESSION_TOKENS}
              onClick={() =>
                updateExpression(
                  appendToken(expression, { type: "operator", op: operator }),
                )
              }
            >
              {t(`metrics.derivedKpi.insertOperator.${operator}`)}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={expression.length >= MAX_DERIVED_EXPRESSION_TOKENS}
            onClick={() =>
              updateExpression(
                appendToken(expression, { type: "paren", side: "open" }),
              )
            }
          >
            {t("metrics.derivedKpi.insertOpenParen")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={expression.length >= MAX_DERIVED_EXPRESSION_TOKENS}
            onClick={() =>
              updateExpression(
                appendToken(expression, { type: "paren", side: "close" }),
              )
            }
          >
            {t("metrics.derivedKpi.insertCloseParen")}
          </Button>
        </div>
      </div>

      {grammarError ? (
        <Text className="text-destructive text-xs">
          {t("metrics.derivedKpi.invalidExpression")}
        </Text>
      ) : null}

      {shapeMismatchName ? (
        <Text className="text-destructive text-xs">
          {t("metrics.derivedKpi.shapeMismatchNamed", {
            name: shapeMismatchName,
          })}
        </Text>
      ) : null}

      {primaryDefinition ? (
        <MetricBindingsEditor
          metric={primaryDefinition}
          bindings={{
            groupBindings: config.groupBindings,
            dimensionBindings: config.dimensionBindings,
          }}
          entityDefinition={bindingEntityDefinition}
          filterFieldOptions={bindingFilterFieldOptions}
          onChange={(bindings) =>
            onChange({
              ...config,
              groupBindings: bindings.groupBindings,
              dimensionBindings: bindings.dimensionBindings,
            })
          }
        />
      ) : null}
    </div>
  );
}
