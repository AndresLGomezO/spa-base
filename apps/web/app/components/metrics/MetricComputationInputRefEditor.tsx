import type { ComputedMetricInputRef } from "@repo/metrics-engine/browser";
import { Button, FieldLabel, Input, Select, Text } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  EntityQueryDefinitionRecord,
  MetricDefinitionRecord,
} from "../../lib/api-client.js";
import {
  formatMetricDefinitionOptionLabel,
  resolveMetricDefinitionDocumentId,
} from "../../lib/resolve-metric-definition-reference.js";
import {
  appendParameterMapEntry,
  createEmptyMetricRef,
  createEmptyQueryRef,
  parameterMapToEntries,
  removeParameterMapKey,
  renameParameterMapKey,
  selectClassName,
  updateParameterMapValue,
} from "./metric-computation-shared.js";

interface MetricComputationInputRefEditorProps {
  readonly value: ComputedMetricInputRef;
  readonly onChange: (value: ComputedMetricInputRef) => void;
  readonly parameterNames: readonly string[];
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
  readonly queryDefinitions: readonly EntityQueryDefinitionRecord[];
  readonly readOnly?: boolean;
}

const AGGREGATION_OPERATIONS = ["SUM", "COUNT", "AVG"] as const;

function ParameterMapEditor({
  parameterMap,
  parameterNames,
  readOnly,
  onChange,
}: {
  readonly parameterMap: Readonly<Record<string, string>>;
  readonly parameterNames: readonly string[];
  readonly readOnly?: boolean;
  readonly onChange: (parameterMap: Record<string, string>) => void;
}) {
  const { t } = useTranslation("common");
  const entries = parameterMapToEntries(parameterMap);

  return (
    <div className="space-y-2">
      <Text className="text-muted-foreground text-xs font-medium">
        {t("metrics.computed.inputRef.parameterMap", {
          defaultValue: "Parameter map",
        })}
      </Text>

      {entries.length === 0 ? (
        <Text className="text-muted-foreground text-xs">
          {t("metrics.computed.inputRef.parameterMapEmpty", {
            defaultValue: "Map source fields to metric parameters.",
          })}
        </Text>
      ) : null}

      {entries.map(({ key, value }) => (
        <div
          key={key}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
        >
          <Input
            value={key}
            disabled={readOnly}
            placeholder={t("metrics.computed.inputRef.fieldKey", {
              defaultValue: "field",
            })}
            onChange={(event) =>
              onChange(
                renameParameterMapKey(parameterMap, key, event.target.value),
              )
            }
          />
          <Select
            className={selectClassName}
            value={value}
            disabled={readOnly}
            onChange={(event) =>
              onChange(
                updateParameterMapValue(parameterMap, key, event.target.value),
              )
            }
          >
            <option value="">
              {t("metrics.computed.inputRef.selectParameter", {
                defaultValue: "Select parameter",
              })}
            </option>
            {parameterNames.map((parameterName) => (
              <option key={parameterName} value={parameterName}>
                {parameterName}
              </option>
            ))}
          </Select>
          {!readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(removeParameterMapKey(parameterMap, key))}
            >
              {t("metrics.computed.inputRef.removeMapping", {
                defaultValue: "Remove",
              })}
            </Button>
          ) : null}
        </div>
      ))}

      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(appendParameterMapEntry(parameterMap))}
        >
          {t("metrics.computed.inputRef.addMapping", {
            defaultValue: "Add mapping",
          })}
        </Button>
      ) : null}
    </div>
  );
}

export function MetricComputationInputRefEditor({
  value,
  onChange,
  parameterNames,
  metricDefinitions,
  queryDefinitions,
  readOnly = false,
}: MetricComputationInputRefEditorProps) {
  const { t } = useTranslation("common");

  const sortedMetricOptions = useMemo(
    () =>
      [...metricDefinitions].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [metricDefinitions],
  );

  const sortedQueryOptions = useMemo(
    () =>
      [...queryDefinitions].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [queryDefinitions],
  );

  const resolvedMetricDefinitionId =
    value.type === "metricRef"
      ? (resolveMetricDefinitionDocumentId(
          value.metricDefinitionId,
          metricDefinitions,
        ) ?? "")
      : "";

  return (
    <div className="border-border space-y-3 rounded-md border p-3">
      <div>
        <FieldLabel htmlFor="metric-input-ref-type">
          {t("metrics.computed.inputRef.type", {
            defaultValue: "Input source",
          })}
        </FieldLabel>
        <Select
          id="metric-input-ref-type"
          className={selectClassName}
          value={value.type}
          disabled={readOnly}
          onChange={(event) => {
            const nextType = event.target
              .value as ComputedMetricInputRef["type"];
            if (nextType === "metricRef") {
              onChange(createEmptyMetricRef());
              return;
            }
            onChange(createEmptyQueryRef());
          }}
        >
          <option value="metricRef">
            {t("metrics.computed.inputRef.types.metricRef", {
              defaultValue: "Metric",
            })}
          </option>
          <option value="queryRef">
            {t("metrics.computed.inputRef.types.queryRef", {
              defaultValue: "Query",
            })}
          </option>
        </Select>
      </div>

      {value.type === "metricRef" ? (
        <div>
          <FieldLabel htmlFor="metric-input-ref-metric">
            {t("metrics.computed.inputRef.metricDefinition", {
              defaultValue: "Metric definition",
            })}
          </FieldLabel>
          <Select
            id="metric-input-ref-metric"
            className={selectClassName}
            value={resolvedMetricDefinitionId}
            disabled={readOnly}
            onChange={(event) =>
              onChange({
                ...value,
                metricDefinitionId: event.target.value,
              })
            }
          >
            <option value="">
              {t("entity.viewSettings.metrics.selectMetric", {
                defaultValue: "Select metric",
              })}
            </option>
            {sortedMetricOptions.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {formatMetricDefinitionOptionLabel(metric)}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <>
          <div>
            <FieldLabel htmlFor="metric-input-ref-query">
              {t("metrics.computed.inputRef.queryDefinition", {
                defaultValue: "Query definition",
              })}
            </FieldLabel>
            <Select
              id="metric-input-ref-query"
              className={selectClassName}
              value={value.queryDefinitionId}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...value,
                  queryDefinitionId: event.target.value,
                })
              }
            >
              <option value="">
                {t("metrics.selectQuery", {
                  defaultValue: "Select query",
                })}
              </option>
              {sortedQueryOptions.map((query) => (
                <option key={query.id} value={query.id}>
                  {query.name} ({query.sourceEntity})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <FieldLabel htmlFor="metric-input-ref-aggregation-operation">
              {t("metrics.operation", {
                defaultValue: "Operation",
              })}
            </FieldLabel>
            <Select
              id="metric-input-ref-aggregation-operation"
              className={selectClassName}
              value={value.aggregationOperation ?? "SUM"}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...value,
                  aggregationOperation: event.target.value as
                    | "SUM"
                    | "COUNT"
                    | "AVG",
                })
              }
            >
              {AGGREGATION_OPERATIONS.map((operation) => (
                <option key={operation} value={operation}>
                  {t(`metrics.operations.${operation}`, {
                    defaultValue: operation,
                  })}
                </option>
              ))}
            </Select>
          </div>

          {value.aggregationOperation !== "COUNT" ? (
            <div>
              <FieldLabel htmlFor="metric-input-ref-aggregation-field">
                {t("metrics.aggregationField", {
                  defaultValue: "Aggregation field",
                })}
              </FieldLabel>
              <Input
                id="metric-input-ref-aggregation-field"
                value={value.aggregationField ?? ""}
                disabled={readOnly}
                placeholder={t(
                  "metrics.computed.inputRef.aggregationFieldPlaceholder",
                  {
                    defaultValue: "amount",
                  },
                )}
                onChange={(event) =>
                  onChange({
                    ...value,
                    aggregationField: event.target.value,
                  })
                }
              />
            </div>
          ) : null}
        </>
      )}

      <ParameterMapEditor
        parameterMap={value.parameterMap}
        parameterNames={parameterNames}
        readOnly={readOnly}
        onChange={(parameterMap) => onChange({ ...value, parameterMap })}
      />
    </div>
  );
}
