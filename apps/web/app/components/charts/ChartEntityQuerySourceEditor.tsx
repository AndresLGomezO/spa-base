import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  ChartDataSource,
  ChartEntityQueryRowFilter,
  ChartEntityQueryTimeSeries,
  ChartEntityQueryValueTransform,
  ChartMetricSeriesStep,
} from "@repo/ui-builder-core";
import { Select, Text } from "@repo/ui";

import { getEntityLabel } from "../../entities/entity-catalog.js";
import type { EntityCatalogEntry } from "../../entities/entity-catalog.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import { EntityFieldConditionValueInput } from "../entity/EntityFieldConditionValueInput.js";
import { EntityFieldPathSelect } from "../entity/EntityFieldPathSelect.js";
import {
  createDefaultConditionField,
  createDefaultConditionValue,
  normalizeConditionValue,
  resolveEntityFieldMeta,
} from "../entity/entity-field-condition-utils.js";
import { useEntityQueryDefinitions } from "../../hooks/useEntityQueryDefinitions.js";
import type { EntityQueryDefinitionRecord } from "../../lib/api-client.js";
import { resolveEntityQueryDefinitionDocumentId } from "../../lib/resolve-entity-query-definition-reference.js";

interface ChartEntityQuerySourceEditorProps {
  readonly dataSource: Extract<ChartDataSource, { type: "entityQuery" }>;
  readonly onChange: (
    dataSource: Extract<ChartDataSource, { type: "entityQuery" }>,
  ) => void;
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </label>
  );
}

function resolveQueryLabel(
  query: EntityQueryDefinitionRecord,
  getEntityLabelFn: (name: string) => string,
): string {
  const entityLabel = getEntityLabelFn(query.sourceEntity);
  return `${entityLabel} · ${query.name}`;
}

const DEFAULT_TIME_SERIES: ChartEntityQueryTimeSeries = {
  periodParameter: "period",
  bucketCount: 12,
  step: { unit: "month", offsetStart: -11, offsetEnd: 0 },
  aggregate: "sum",
};

const DEFAULT_MTD_TIME_SERIES: ChartEntityQueryTimeSeries = {
  periodParameter: "period",
  bucketCount: 30,
  layout: "monthToDateRightAligned",
  step: { unit: "day", offsetStart: 0, offsetEnd: 0 },
  aggregate: "sum",
};

function RowFilterRow({
  filter,
  sourceDefinition,
  onChange,
  onRemove,
}: {
  readonly filter: ChartEntityQueryRowFilter;
  readonly sourceDefinition: EntityCatalogEntry | undefined;
  readonly onChange: (next: ChartEntityQueryRowFilter) => void;
  readonly onRemove: () => void;
}) {
  const { t } = useTranslation("common");
  const fieldMeta = resolveEntityFieldMeta(sourceDefinition, filter.whenField);

  return (
    <div className="border-border/60 flex flex-col gap-2 rounded-md border p-2">
      <Field label={t("chartComponent.valueTransformField")}>
        <EntityFieldPathSelect
          entity={sourceDefinition}
          value={filter.whenField}
          disabled={!sourceDefinition}
          onChange={(nextField) => {
            const nextMeta = resolveEntityFieldMeta(
              sourceDefinition,
              nextField,
            );
            onChange({
              ...filter,
              whenField: nextField,
              whenValue: normalizeConditionValue(
                nextMeta,
                filter.whenOperator,
                filter.whenValue,
              ),
            });
          }}
        />
      </Field>
      <Field label={t("chartComponent.valueTransformOperator")}>
        <Select
          value={filter.whenOperator}
          onChange={(event) => {
            const nextOperator = event.target
              .value as ChartEntityQueryRowFilter["whenOperator"];
            onChange({
              ...filter,
              whenOperator: nextOperator,
              whenValue: normalizeConditionValue(
                fieldMeta,
                nextOperator,
                filter.whenValue,
              ),
            });
          }}
        >
          <option value="==">{t("chartComponent.valueTransformEquals")}</option>
          <option value="in">{t("chartComponent.valueTransformIn")}</option>
        </Select>
      </Field>
      <Field label={t("chartComponent.valueTransformValue")}>
        <EntityFieldConditionValueInput
          fieldMeta={fieldMeta}
          operator={filter.whenOperator}
          value={filter.whenValue}
          disabled={!filter.whenField}
          onChange={(nextValue) =>
            onChange({ ...filter, whenValue: nextValue })
          }
        />
      </Field>
      <button
        type="button"
        className="text-destructive text-xs"
        onClick={onRemove}
      >
        {t("chartComponent.removeRowFilter")}
      </button>
    </div>
  );
}

function ValueTransformRow({
  transform,
  sourceDefinition,
  onChange,
  onRemove,
}: {
  readonly transform: ChartEntityQueryValueTransform;
  readonly sourceDefinition: EntityCatalogEntry | undefined;
  readonly onChange: (next: ChartEntityQueryValueTransform) => void;
  readonly onRemove: () => void;
}) {
  const { t } = useTranslation("common");
  const fieldMeta = resolveEntityFieldMeta(
    sourceDefinition,
    transform.whenField,
  );

  return (
    <div className="border-border/60 flex flex-col gap-2 rounded-md border p-2">
      <Field label={t("chartComponent.valueTransformField")}>
        <EntityFieldPathSelect
          entity={sourceDefinition}
          value={transform.whenField}
          disabled={!sourceDefinition}
          onChange={(nextField) => {
            const nextMeta = resolveEntityFieldMeta(
              sourceDefinition,
              nextField,
            );
            onChange({
              ...transform,
              whenField: nextField,
              whenValue: normalizeConditionValue(
                nextMeta,
                transform.whenOperator,
                transform.whenValue,
              ),
            });
          }}
        />
      </Field>
      <Field label={t("chartComponent.valueTransformOperator")}>
        <Select
          value={transform.whenOperator}
          onChange={(event) => {
            const nextOperator = event.target
              .value as ChartEntityQueryValueTransform["whenOperator"];
            onChange({
              ...transform,
              whenOperator: nextOperator,
              whenValue: normalizeConditionValue(
                fieldMeta,
                nextOperator,
                transform.whenValue,
              ),
            });
          }}
        >
          <option value="==">{t("chartComponent.valueTransformEquals")}</option>
          <option value="in">{t("chartComponent.valueTransformIn")}</option>
        </Select>
      </Field>
      <Field label={t("chartComponent.valueTransformValue")}>
        <EntityFieldConditionValueInput
          fieldMeta={fieldMeta}
          operator={transform.whenOperator}
          value={transform.whenValue}
          disabled={!transform.whenField}
          onChange={(nextValue) =>
            onChange({ ...transform, whenValue: nextValue })
          }
        />
      </Field>
      <Field label={t("chartComponent.valueTransformMultiplier")}>
        <input
          type="number"
          step="any"
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={transform.multiplier}
          onChange={(event) =>
            onChange({
              ...transform,
              multiplier: Number.parseFloat(event.target.value) || 0,
            })
          }
        />
      </Field>
      <button
        type="button"
        className="text-destructive text-xs"
        onClick={onRemove}
      >
        {t("chartComponent.removeValueTransform")}
      </button>
    </div>
  );
}

export function ChartEntityQuerySourceEditor({
  dataSource,
  onChange,
}: ChartEntityQuerySourceEditorProps) {
  const { t } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const definitionsQuery = useEntityQueryDefinitions();
  const definitions = useMemo(
    () => definitionsQuery.data ?? [],
    [definitionsQuery.data],
  );

  const timeSeriesEnabled = Boolean(dataSource.timeSeries);
  const timeSeries = dataSource.timeSeries ?? DEFAULT_TIME_SERIES;
  const rowFilters = timeSeries.rowFilters ?? [];
  const valueTransforms = timeSeries.valueTransforms ?? [];
  const isMonthToDateLayout = timeSeries.layout === "monthToDateRightAligned";

  const queryOptions = useMemo(() => {
    return definitions.map((query) => ({
      value: query.id,
      label: resolveQueryLabel(query, (entityName) =>
        getEntityLabel(getDefinition(entityName)),
      ),
    }));
  }, [definitions, getDefinition]);

  const resolvedQueryDocumentId = useMemo(
    () =>
      resolveEntityQueryDefinitionDocumentId(
        dataSource.entityQueryDefinitionId,
        definitions,
      ) ?? "",
    [dataSource.entityQueryDefinitionId, definitions],
  );

  const selectedQuery = definitions.find(
    (query) => query.id === resolvedQueryDocumentId,
  );
  const sourceDefinition = selectedQuery
    ? getDefinition(selectedQuery.sourceEntity)
    : undefined;
  const fieldOptions = sourceDefinition
    ? Object.keys(sourceDefinition.fields)
    : [];

  function updateTimeSeries(
    patch: Omit<Partial<ChartEntityQueryTimeSeries>, "step"> & {
      step?: Partial<ChartMetricSeriesStep>;
    },
  ) {
    onChange({
      ...dataSource,
      timeSeries: {
        ...timeSeries,
        ...patch,
        step: patch.step
          ? { ...timeSeries.step, ...patch.step }
          : timeSeries.step,
      },
    });
  }

  function updateRowFilters(next: readonly ChartEntityQueryRowFilter[]) {
    updateTimeSeries({
      rowFilters: next.length > 0 ? next : undefined,
    });
  }

  function updateValueTransforms(
    next: readonly ChartEntityQueryValueTransform[],
  ) {
    updateTimeSeries({
      valueTransforms: next.length > 0 ? next : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label={t("chartComponent.timeSeriesMode")}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={timeSeriesEnabled}
            onChange={(event) =>
              onChange({
                ...dataSource,
                timeSeries: event.target.checked
                  ? DEFAULT_TIME_SERIES
                  : undefined,
              })
            }
          />
          {t("chartComponent.timeSeriesModeHelp")}
        </label>
      </Field>

      {timeSeriesEnabled ? (
        <div className="border-border/60 flex flex-col gap-3 rounded-md border p-3">
          <Field label={t("chartComponent.entityQuery")}>
            <Select
              value={resolvedQueryDocumentId}
              onChange={(event) =>
                onChange({
                  ...dataSource,
                  entityQueryDefinitionId: event.target.value,
                })
              }
            >
              <option value="">
                {t("metricsRowDesigner.queryViewerEditor.selectQuery")}
              </option>
              {queryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("chartComponent.periodParameter")}>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={timeSeries.periodParameter}
              onChange={(event) =>
                updateTimeSeries({ periodParameter: event.target.value })
              }
            />
          </Field>
          <Field label={t("chartComponent.timeSeriesLayout")}>
            <Select
              value={timeSeries.layout ?? "span"}
              onChange={(event) => {
                const layout = event.target.value as NonNullable<
                  ChartEntityQueryTimeSeries["layout"]
                >;
                if (layout === "monthToDateRightAligned") {
                  onChange({
                    ...dataSource,
                    timeSeries: {
                      ...timeSeries,
                      ...DEFAULT_MTD_TIME_SERIES,
                      rowFilters: timeSeries.rowFilters,
                      valueTransforms: timeSeries.valueTransforms,
                    },
                  });
                  return;
                }
                updateTimeSeries({
                  layout: undefined,
                  bucketCount: 12,
                  step: { unit: "month", offsetStart: -11, offsetEnd: 0 },
                });
              }}
            >
              <option value="span">
                {t("chartComponent.timeSeriesLayouts.span")}
              </option>
              <option value="monthToDateRightAligned">
                {t("chartComponent.timeSeriesLayouts.monthToDateRightAligned")}
              </option>
            </Select>
          </Field>
          <Field label={t("chartComponent.bucketCount")}>
            <input
              type="number"
              min={1}
              max={366}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              value={timeSeries.bucketCount}
              disabled={isMonthToDateLayout}
              onChange={(event) =>
                updateTimeSeries({
                  bucketCount: Number.parseInt(event.target.value, 10) || 1,
                })
              }
            />
          </Field>
          <Field label={t("chartComponent.stepUnit")}>
            <Select
              value={timeSeries.step.unit}
              disabled={isMonthToDateLayout}
              onChange={(event) =>
                updateTimeSeries({
                  step: {
                    unit: event.target.value as ChartMetricSeriesStep["unit"],
                  },
                })
              }
            >
              <option value="day">{t("chartComponent.units.day")}</option>
              <option value="month">{t("chartComponent.units.month")}</option>
              <option value="year">{t("chartComponent.units.year")}</option>
            </Select>
          </Field>
          {!isMonthToDateLayout ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("chartComponent.offsetStart")}>
                <input
                  type="number"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={timeSeries.step.offsetStart}
                  onChange={(event) =>
                    updateTimeSeries({
                      step: {
                        offsetStart:
                          Number.parseInt(event.target.value, 10) || 0,
                      },
                    })
                  }
                />
              </Field>
              <Field label={t("chartComponent.offsetEnd")}>
                <input
                  type="number"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={timeSeries.step.offsetEnd}
                  onChange={(event) =>
                    updateTimeSeries({
                      step: {
                        offsetEnd: Number.parseInt(event.target.value, 10) || 0,
                      },
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
          <Field label={t("chartComponent.timeSeriesAggregate")}>
            <Select
              value={timeSeries.aggregate}
              onChange={(event) =>
                updateTimeSeries({
                  aggregate: event.target
                    .value as ChartEntityQueryTimeSeries["aggregate"],
                })
              }
            >
              <option value="sum">{t("chartComponent.aggregateSum")}</option>
              <option value="count">
                {t("chartComponent.aggregateCount")}
              </option>
            </Select>
          </Field>

          <Field label={t("chartComponent.rowFilters")}>
            <div className="flex flex-col gap-2">
              {rowFilters.map((filter, index) => (
                <RowFilterRow
                  key={index}
                  filter={filter}
                  sourceDefinition={sourceDefinition}
                  onChange={(next) => {
                    const nextFilters = [...rowFilters];
                    nextFilters[index] = next;
                    updateRowFilters(nextFilters);
                  }}
                  onRemove={() => {
                    updateRowFilters(
                      rowFilters.filter((_, itemIndex) => itemIndex !== index),
                    );
                  }}
                />
              ))}
              <button
                type="button"
                className="text-primary text-xs"
                onClick={() => {
                  const defaultField =
                    createDefaultConditionField(sourceDefinition);
                  updateRowFilters([
                    ...rowFilters,
                    {
                      whenField: defaultField,
                      whenOperator: "==",
                      whenValue: createDefaultConditionValue(
                        sourceDefinition,
                        defaultField,
                        "==",
                      ),
                    },
                  ]);
                }}
              >
                {t("chartComponent.addRowFilter")}
              </button>
            </div>
          </Field>

          <Field label={t("chartComponent.valueTransforms")}>
            <div className="flex flex-col gap-2">
              {valueTransforms.map((transform, index) => (
                <ValueTransformRow
                  key={index}
                  transform={transform}
                  sourceDefinition={sourceDefinition}
                  onChange={(next) => {
                    const nextTransforms = [...valueTransforms];
                    nextTransforms[index] = next;
                    updateValueTransforms(nextTransforms);
                  }}
                  onRemove={() => {
                    updateValueTransforms(
                      valueTransforms.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    );
                  }}
                />
              ))}
              <button
                type="button"
                className="text-primary text-xs"
                onClick={() => {
                  const defaultField =
                    createDefaultConditionField(sourceDefinition);
                  updateValueTransforms([
                    ...valueTransforms,
                    {
                      whenField: defaultField,
                      whenOperator: "in",
                      whenValue: createDefaultConditionValue(
                        sourceDefinition,
                        defaultField,
                        "in",
                      ),
                      multiplier: -1,
                    },
                  ]);
                }}
              >
                {t("chartComponent.addValueTransform")}
              </button>
            </div>
          </Field>
        </div>
      ) : (
        <Field label={t("chartComponent.entityQuery")}>
          <Select
            value={resolvedQueryDocumentId}
            onChange={(event) =>
              onChange({
                ...dataSource,
                entityQueryDefinitionId: event.target.value,
              })
            }
          >
            <option value="">
              {t("metricsRowDesigner.queryViewerEditor.selectQuery")}
            </option>
            {queryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {definitionsQuery.isLoading ? (
        <Text className="text-muted-foreground text-xs">{t("loading")}</Text>
      ) : null}
      {definitionsQuery.error instanceof Error ? (
        <Text className="text-destructive text-xs">
          {definitionsQuery.error.message}
        </Text>
      ) : null}

      <Field label={t("chartComponent.xFieldPath")}>
        <Select
          value={dataSource.xFieldPath}
          onChange={(event) =>
            onChange({ ...dataSource, xFieldPath: event.target.value })
          }
        >
          <option value="">
            {t("metricsRowDesigner.queryViewerEditor.selectQuery")}
          </option>
          {fieldOptions.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("chartComponent.yFieldPath")}>
        <Select
          value={dataSource.yFieldPath}
          onChange={(event) =>
            onChange({ ...dataSource, yFieldPath: event.target.value })
          }
        >
          <option value="">
            {t("metricsRowDesigner.queryViewerEditor.selectQuery")}
          </option>
          {fieldOptions.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </Select>
      </Field>

      {!timeSeriesEnabled ? (
        <Field label={t("chartComponent.seriesFieldPath")}>
          <input
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={dataSource.seriesFieldPath ?? ""}
            placeholder={t("chartComponent.seriesFieldPathOptional")}
            onChange={(event) =>
              onChange({
                ...dataSource,
                seriesFieldPath: event.target.value.trim() || undefined,
              })
            }
          />
        </Field>
      ) : null}
    </div>
  );
}
