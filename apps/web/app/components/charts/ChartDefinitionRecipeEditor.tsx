import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  ChartDataSource,
  ChartDefinitionRecipe,
  ChartPoint,
  ChartType,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import { MetricBindingsEditor } from "../metrics/MetricBindingsEditor.js";
import { MetricBindingSourceEditor } from "../metrics/MetricBindingSourceEditor.js";
import { ChartEntityQuerySourceEditor } from "./ChartEntityQuerySourceEditor.js";
import {
  formatMetricDefinitionOptionLabel,
  resolveMetricDefinitionDocumentId,
} from "../../lib/resolve-metric-definition-reference.js";
import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import type { MetricDefinitionRecord } from "../../lib/api-client.js";

interface ChartDefinitionRecipeEditorProps {
  readonly recipe: ChartDefinitionRecipe;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (recipe: ChartDefinitionRecipe) => void;
}

function updateDataSource(
  recipe: ChartDefinitionRecipe,
  dataSource: ChartDataSource,
): ChartDefinitionRecipe {
  return { ...recipe, dataSource };
}

function updatePrimarySeries(
  recipe: ChartDefinitionRecipe,
  patch: Partial<NonNullable<ChartDefinitionRecipe["series"]>[number]>,
): ChartDefinitionRecipe {
  const current = recipe.series?.[0] ?? { id: "default" };
  return {
    ...recipe,
    series: [{ ...current, ...patch, id: current.id || "default" }],
  };
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </label>
  );
}

function MetricSeriesEditorSection({
  recipe,
  definitions,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: {
  readonly recipe: ChartDefinitionRecipe;
  readonly definitions: readonly MetricDefinitionRecord[] | undefined;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (recipe: ChartDefinitionRecipe) => void;
}) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();

  if (recipe.dataSource.type !== "metricSeries") {
    return null;
  }

  const dataSource = recipe.dataSource;
  const resolvedId = resolveMetricDefinitionDocumentId(
    dataSource.metricDefinitionId,
    definitions ?? [],
  );
  const metricDefinition = (definitions ?? []).find(
    (entry) => entry.id === resolvedId,
  );
  const bindingEntityDefinition =
    metricDefinition &&
    entities.find((entity) => entity.name === metricDefinition.sourceModel)
      ? entities.find((entity) => entity.name === metricDefinition.sourceModel)!
      : entityDefinition;
  const bindingFilterFieldOptions =
    bindingEntityDefinition === entityDefinition
      ? filterFieldOptions
      : Object.keys(bindingEntityDefinition.fields).filter(
          (field) => bindingEntityDefinition.fields[field]?.type !== "document",
        );

  return (
    <div className="flex flex-col gap-3">
      <Field label={t("entity.viewSettings.metrics.definition")}>
        <Select
          value={resolvedId ?? ""}
          onChange={(event) =>
            onChange(
              updateDataSource(recipe, {
                ...dataSource,
                metricDefinitionId: event.target.value,
              }),
            )
          }
        >
          <option value="">
            {t("entity.viewSettings.metrics.selectMetric")}
          </option>
          {(definitions ?? []).map((definition) => (
            <option key={definition.id} value={definition.id}>
              {formatMetricDefinitionOptionLabel(definition)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("chartComponent.dimensionField")}>
        <input
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={dataSource.dimensionField}
          onChange={(event) =>
            onChange(
              updateDataSource(recipe, {
                ...dataSource,
                dimensionField: event.target.value,
              }),
            )
          }
        />
      </Field>

      <Field label={t("chartComponent.bucketCount")}>
        <input
          type="number"
          min={1}
          max={366}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={dataSource.bucketCount}
          onChange={(event) =>
            onChange(
              updateDataSource(recipe, {
                ...dataSource,
                bucketCount: Number(event.target.value) || 1,
              }),
            )
          }
        />
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label={t("chartComponent.stepUnit")}>
          <Select
            value={dataSource.step.unit}
            onChange={(event) =>
              onChange(
                updateDataSource(recipe, {
                  ...dataSource,
                  step: {
                    ...dataSource.step,
                    unit: event.target.value as "day" | "month" | "year",
                  },
                }),
              )
            }
          >
            <option value="day">{t("chartComponent.units.day")}</option>
            <option value="month">{t("chartComponent.units.month")}</option>
            <option value="year">{t("chartComponent.units.year")}</option>
          </Select>
        </Field>
        <Field label={t("chartComponent.offsetStart")}>
          <input
            type="number"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={dataSource.step.offsetStart}
            onChange={(event) =>
              onChange(
                updateDataSource(recipe, {
                  ...dataSource,
                  step: {
                    ...dataSource.step,
                    offsetStart: Number(event.target.value),
                  },
                }),
              )
            }
          />
        </Field>
        <Field label={t("chartComponent.offsetEnd")}>
          <input
            type="number"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={dataSource.step.offsetEnd}
            onChange={(event) =>
              onChange(
                updateDataSource(recipe, {
                  ...dataSource,
                  step: {
                    ...dataSource.step,
                    offsetEnd: Number(event.target.value),
                  },
                }),
              )
            }
          />
        </Field>
      </div>

      {metricDefinition?.computationMode === "computed"
        ? (metricDefinition.parameters ?? [])
            .filter((parameter) => !parameter.deriveFrom)
            .map((parameter) => (
              <MetricBindingSourceEditor
                key={parameter.name}
                fieldName={parameter.name}
                source={dataSource.parameterBindings?.[parameter.name]}
                definition={bindingEntityDefinition}
                filterFieldOptions={bindingFilterFieldOptions}
                dateGranularity={parameter.granularity}
                onChange={(source) =>
                  onChange(
                    updateDataSource(recipe, {
                      ...dataSource,
                      parameterBindings: {
                        ...(dataSource.parameterBindings ?? {}),
                        [parameter.name]: source,
                      },
                    }),
                  )
                }
              />
            ))
        : null}

      {metricDefinition && metricDefinition.computationMode !== "computed" ? (
        <MetricBindingsEditor
          metric={metricDefinition}
          bindings={{
            groupBindings: dataSource.groupBindings ?? {},
            dimensionBindings: dataSource.dimensionBindings ?? {},
          }}
          entityDefinition={bindingEntityDefinition}
          filterFieldOptions={bindingFilterFieldOptions}
          onChange={(bindings) =>
            onChange(
              updateDataSource(recipe, {
                ...dataSource,
                groupBindings: bindings.groupBindings,
                dimensionBindings: bindings.dimensionBindings,
              }),
            )
          }
        />
      ) : null}
    </div>
  );
}

function MetricValueEditorSection({
  recipe,
  definitions,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: {
  readonly recipe: ChartDefinitionRecipe;
  readonly definitions: readonly MetricDefinitionRecord[] | undefined;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (recipe: ChartDefinitionRecipe) => void;
}) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();

  if (recipe.dataSource.type !== "metricValue") {
    return null;
  }

  const dataSource = recipe.dataSource;
  const resolvedId = resolveMetricDefinitionDocumentId(
    dataSource.metricDefinitionId,
    definitions ?? [],
  );
  const metricDefinition = (definitions ?? []).find(
    (entry) => entry.id === resolvedId,
  );
  const bindingEntityDefinition =
    metricDefinition &&
    entities.find((entity) => entity.name === metricDefinition.sourceModel)
      ? entities.find((entity) => entity.name === metricDefinition.sourceModel)!
      : entityDefinition;
  const bindingFilterFieldOptions =
    bindingEntityDefinition === entityDefinition
      ? filterFieldOptions
      : Object.keys(bindingEntityDefinition.fields).filter(
          (field) => bindingEntityDefinition.fields[field]?.type !== "document",
        );

  return (
    <div className="flex flex-col gap-3">
      <Field label={t("entity.viewSettings.metrics.definition")}>
        <Select
          value={resolvedId ?? ""}
          onChange={(event) =>
            onChange(
              updateDataSource(recipe, {
                ...dataSource,
                metricDefinitionId: event.target.value,
              }),
            )
          }
        >
          <option value="">
            {t("entity.viewSettings.metrics.selectMetric")}
          </option>
          {(definitions ?? []).map((definition) => (
            <option key={definition.id} value={definition.id}>
              {formatMetricDefinitionOptionLabel(definition)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("chartComponent.maxValue")}>
        <input
          type="number"
          min={1}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={dataSource.maxValue ?? 100}
          onChange={(event) =>
            onChange(
              updateDataSource(recipe, {
                ...dataSource,
                maxValue: Number(event.target.value) || 100,
              }),
            )
          }
        />
      </Field>

      {metricDefinition?.computationMode === "computed"
        ? (metricDefinition.parameters ?? [])
            .filter((parameter) => !parameter.deriveFrom)
            .map((parameter) => (
              <MetricBindingSourceEditor
                key={parameter.name}
                fieldName={parameter.name}
                source={dataSource.parameterBindings?.[parameter.name]}
                definition={bindingEntityDefinition}
                filterFieldOptions={bindingFilterFieldOptions}
                dateGranularity={parameter.granularity}
                onChange={(source) =>
                  onChange(
                    updateDataSource(recipe, {
                      ...dataSource,
                      parameterBindings: {
                        ...(dataSource.parameterBindings ?? {}),
                        [parameter.name]: source,
                      },
                    }),
                  )
                }
              />
            ))
        : null}

      {metricDefinition && metricDefinition.computationMode !== "computed" ? (
        <MetricBindingsEditor
          metric={metricDefinition}
          bindings={{
            groupBindings: dataSource.groupBindings ?? {},
            dimensionBindings: dataSource.dimensionBindings ?? {},
          }}
          entityDefinition={bindingEntityDefinition}
          filterFieldOptions={bindingFilterFieldOptions}
          onChange={(bindings) =>
            onChange(
              updateDataSource(recipe, {
                ...dataSource,
                groupBindings: bindings.groupBindings,
                dimensionBindings: bindings.dimensionBindings,
              }),
            )
          }
        />
      ) : null}
    </div>
  );
}

export function ChartDefinitionRecipeEditor({
  recipe,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: ChartDefinitionRecipeEditorProps) {
  const { t } = useTranslation("common");
  const definitionsQuery = useActiveMetricDefinitions(true);
  const definitions = definitionsQuery.data ?? [];

  const staticPointsJson = useMemo(() => {
    if (recipe.dataSource.type !== "static") {
      return "[]";
    }
    return JSON.stringify(recipe.dataSource.points, null, 2);
  }, [recipe.dataSource]);

  const isDonutChart = recipe.chartType === "donut";

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("chartComponent.chartType")}>
        <Select
          value={recipe.chartType}
          onChange={(event) => {
            const chartType = event.target.value as ChartType;
            if (chartType === "donut") {
              onChange({
                ...recipe,
                chartType,
                dataSource:
                  recipe.dataSource.type === "metricValue"
                    ? recipe.dataSource
                    : {
                        type: "metricValue",
                        metricDefinitionId: "",
                        maxValue: 100,
                        groupBindings: {},
                        dimensionBindings: {},
                        parameterBindings: {},
                      },
                donut: recipe.donut ?? {
                  innerRadiusRatio: 0.72,
                  showCenterLabel: true,
                },
                legend: { visible: false, position: "none" },
                xAxis: { visible: false, showTicks: false },
                yAxis: { visible: false, showTicks: false },
                grid: { visible: false },
              });
              return;
            }

            onChange({
              ...recipe,
              chartType,
            });
          }}
        >
          <option value="line">{t("chartComponent.types.line")}</option>
          <option value="area">{t("chartComponent.types.area")}</option>
          <option value="donut">{t("chartComponent.types.donut")}</option>
        </Select>
      </Field>

      <Field label={t("chartComponent.displayMode")}>
        <Select
          value={recipe.displayMode ?? "inline"}
          onChange={(event) =>
            onChange({
              ...recipe,
              displayMode: event.target.value as "inline" | "overlay",
            })
          }
        >
          <option value="inline">
            {t("chartComponent.displayModes.inline")}
          </option>
          <option value="overlay">
            {t("chartComponent.displayModes.overlay")}
          </option>
        </Select>
      </Field>

      <Field label={t("chartComponent.dataSourceType")}>
        <Select
          value={recipe.dataSource.type}
          onChange={(event) => {
            const type = event.target.value as ChartDataSource["type"];
            if (type === "static") {
              onChange(
                updateDataSource(recipe, {
                  type: "static",
                  points:
                    recipe.dataSource.type === "static"
                      ? recipe.dataSource.points
                      : [],
                }),
              );
              return;
            }
            if (type === "metricSeries") {
              onChange(
                updateDataSource(recipe, {
                  type: "metricSeries",
                  metricDefinitionId: "",
                  dimensionField: "date",
                  bucketCount: 12,
                  step: { unit: "month", offsetStart: -11, offsetEnd: 0 },
                  groupBindings: {},
                  dimensionBindings: {},
                }),
              );
              return;
            }
            if (type === "metricValue") {
              onChange(
                updateDataSource(recipe, {
                  type: "metricValue",
                  metricDefinitionId: "",
                  maxValue: 100,
                  groupBindings: {},
                  dimensionBindings: {},
                  parameterBindings: {},
                }),
              );
              return;
            }
            onChange(
              updateDataSource(recipe, {
                type: "entityQuery",
                entityQueryDefinitionId: "",
                xFieldPath: "",
                yFieldPath: "",
              }),
            );
          }}
        >
          <option value="static">
            {t("chartComponent.dataSources.static")}
          </option>
          <option value="metricSeries">
            {t("chartComponent.dataSources.metricSeries")}
          </option>
          <option value="metricValue">
            {t("chartComponent.dataSources.metricValue")}
          </option>
          <option value="entityQuery">
            {t("chartComponent.dataSources.entityQuery")}
          </option>
        </Select>
      </Field>

      {recipe.dataSource.type === "static" ? (
        <Field label={t("chartComponent.staticPoints")}>
          <textarea
            rows={8}
            className="border-input bg-background min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
            value={staticPointsJson}
            onChange={(event) => {
              try {
                const parsed = JSON.parse(event.target.value) as unknown;
                if (!Array.isArray(parsed)) {
                  return;
                }
                onChange(
                  updateDataSource(recipe, {
                    type: "static",
                    points: parsed as ChartPoint[],
                  }),
                );
              } catch {
                // Keep previous value until JSON is valid.
              }
            }}
          />
        </Field>
      ) : null}

      {recipe.dataSource.type === "metricSeries" ? (
        <MetricSeriesEditorSection
          recipe={recipe}
          definitions={definitions}
          entityDefinition={entityDefinition}
          filterFieldOptions={filterFieldOptions}
          onChange={onChange}
        />
      ) : null}

      {recipe.dataSource.type === "metricValue" ? (
        <MetricValueEditorSection
          recipe={recipe}
          definitions={definitions}
          entityDefinition={entityDefinition}
          filterFieldOptions={filterFieldOptions}
          onChange={onChange}
        />
      ) : null}

      {recipe.dataSource.type === "entityQuery" ? (
        <ChartEntityQuerySourceEditor
          dataSource={recipe.dataSource}
          onChange={(dataSource) =>
            onChange(updateDataSource(recipe, dataSource))
          }
        />
      ) : null}

      <div className="border-border/60 flex flex-col gap-3 border-t pt-3">
        <Text className="text-sm font-medium">
          {isDonutChart
            ? t("chartComponent.donutStyle")
            : t("chartComponent.seriesStyle")}
        </Text>
        <Field label={t("chartComponent.seriesLabel")}>
          <input
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={recipe.series?.[0]?.label ?? ""}
            onChange={(event) =>
              onChange(
                updatePrimarySeries(recipe, { label: event.target.value }),
              )
            }
          />
        </Field>
        <Field
          label={t(
            isDonutChart
              ? "chartComponent.fillColor"
              : "chartComponent.seriesColor",
          )}
        >
          <input
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={
              isDonutChart
                ? (recipe.donut?.fillColor ??
                  recipe.series?.[0]?.color ??
                  "var(--color-primary)")
                : (recipe.series?.[0]?.color ?? "var(--color-primary)")
            }
            onChange={(event) =>
              isDonutChart
                ? onChange({
                    ...recipe,
                    donut: {
                      ...recipe.donut,
                      fillColor: event.target.value,
                    },
                  })
                : onChange(
                    updatePrimarySeries(recipe, { color: event.target.value }),
                  )
            }
          />
        </Field>
        {isDonutChart ? (
          <>
            <Field label={t("chartComponent.trackColor")}>
              <input
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={
                  recipe.donut?.trackColor ??
                  "color-mix(in oklch, var(--color-primary) 20%, transparent)"
                }
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    donut: {
                      ...recipe.donut,
                      trackColor: event.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label={t("chartComponent.innerRadiusRatio")}>
              <input
                type="number"
                min={0}
                max={0.95}
                step={0.01}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={recipe.donut?.innerRadiusRatio ?? 0.72}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    donut: {
                      ...recipe.donut,
                      innerRadiusRatio: Number(event.target.value) || 0.72,
                    },
                  })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recipe.donut?.showCenterLabel ?? true}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    donut: {
                      ...recipe.donut,
                      showCenterLabel: event.target.checked,
                    },
                  })
                }
              />
              {t("chartComponent.showCenterLabel")}
            </label>
          </>
        ) : (
          <>
            <Field label={t("chartComponent.strokeWidth")}>
              <input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={recipe.series?.[0]?.strokeWidth ?? 2}
                onChange={(event) =>
                  onChange(
                    updatePrimarySeries(recipe, {
                      strokeWidth: Number(event.target.value) || 2,
                    }),
                  )
                }
              />
            </Field>
            {recipe.chartType === "line" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recipe.series?.[0]?.showAreaFill ?? false}
                  onChange={(event) =>
                    onChange(
                      updatePrimarySeries(recipe, {
                        showAreaFill: event.target.checked,
                      }),
                    )
                  }
                />
                {t("chartComponent.showAreaFill")}
              </label>
            ) : null}
            <Field label={t("chartComponent.areaFillOpacity")}>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={recipe.series?.[0]?.areaFillOpacity ?? 0.25}
                onChange={(event) =>
                  onChange(
                    updatePrimarySeries(recipe, {
                      areaFillOpacity: Number(event.target.value),
                    }),
                  )
                }
              />
            </Field>
          </>
        )}
      </div>

      {!isDonutChart ? (
        <>
          <div className="border-border/60 flex flex-col gap-3 border-t pt-3">
            <Text className="text-sm font-medium">
              {t("chartComponent.legend")}
            </Text>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recipe.legend?.visible ?? false}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    legend: { ...recipe.legend, visible: event.target.checked },
                  })
                }
              />
              {t("chartComponent.legendVisible")}
            </label>
            <Field label={t("chartComponent.legendPosition")}>
              <Select
                value={recipe.legend?.position ?? "none"}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    legend: {
                      ...recipe.legend,
                      position: event.target.value as NonNullable<
                        ChartDefinitionRecipe["legend"]
                      >["position"],
                    },
                  })
                }
              >
                <option value="none">
                  {t("chartComponent.legendPositions.none")}
                </option>
                <option value="top">
                  {t("chartComponent.legendPositions.top")}
                </option>
                <option value="bottom">
                  {t("chartComponent.legendPositions.bottom")}
                </option>
                <option value="left">
                  {t("chartComponent.legendPositions.left")}
                </option>
                <option value="right">
                  {t("chartComponent.legendPositions.right")}
                </option>
              </Select>
            </Field>
            <Field label={t("chartComponent.legendAlign")}>
              <Select
                value={recipe.legend?.align ?? "start"}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    legend: {
                      ...recipe.legend,
                      align: event.target.value as NonNullable<
                        ChartDefinitionRecipe["legend"]
                      >["align"],
                    },
                  })
                }
              >
                <option value="start">
                  {t("chartComponent.legendAlignments.start")}
                </option>
                <option value="center">
                  {t("chartComponent.legendAlignments.center")}
                </option>
                <option value="end">
                  {t("chartComponent.legendAlignments.end")}
                </option>
              </Select>
            </Field>
            <Field label={t("chartComponent.legendFontSize")}>
              <input
                type="number"
                min={8}
                max={32}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={recipe.legend?.fontSize ?? 11}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    legend: {
                      ...recipe.legend,
                      fontSize: Number(event.target.value) || 11,
                    },
                  })
                }
              />
            </Field>
          </div>

          <div className="border-border/60 flex flex-col gap-3 border-t pt-3">
            <Text className="text-sm font-medium">
              {t("chartComponent.axesAndGrid")}
            </Text>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recipe.xAxis?.visible ?? false}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    xAxis: { ...recipe.xAxis, visible: event.target.checked },
                  })
                }
              />
              {t("chartComponent.showXAxis")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recipe.yAxis?.visible ?? false}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    yAxis: { ...recipe.yAxis, visible: event.target.checked },
                  })
                }
              />
              {t("chartComponent.showYAxis")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recipe.grid?.visible ?? false}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    grid: { visible: event.target.checked },
                  })
                }
              />
              {t("chartComponent.showGrid")}
            </label>
          </div>

          <div className="border-border/60 flex flex-col gap-3 border-t pt-3">
            <Text className="text-sm font-medium">
              {t("chartComponent.animation")}
            </Text>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recipe.animation?.enabled ?? true}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    animation: {
                      ...recipe.animation,
                      enabled: event.target.checked,
                    },
                  })
                }
              />
              {t("chartComponent.animationEnabled")}
            </label>
            <Field label={t("chartComponent.animationDuration")}>
              <input
                type="number"
                min={0}
                max={5000}
                step={50}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={recipe.animation?.durationMs ?? 600}
                onChange={(event) =>
                  onChange({
                    ...recipe,
                    animation: {
                      ...recipe.animation,
                      durationMs: Number(event.target.value) || 600,
                    },
                  })
                }
              />
            </Field>
          </div>
        </>
      ) : null}
    </div>
  );
}
