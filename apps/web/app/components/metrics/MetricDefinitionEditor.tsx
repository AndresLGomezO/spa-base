import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  Button,
  FieldLabel,
  Form,
  Heading,
  Input,
  SearchableMultiSelectDropdown,
  Select,
  Text,
  toast,
} from "@repo/ui";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import {
  createMetricDefinition,
  isApiClientError,
  patchMetricDefinition,
  backfillMetricDefinition,
  type MetricDefinitionRecord,
} from "../../lib/api-client";
import { IndexEnvironmentBlockedNotice } from "../index-provisioning/IndexEnvironmentBlockedNotice";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";
import { MetricFieldLabel } from "./MetricFieldHelp";
import { MetricDefinitionSummary } from "./MetricDefinitionSummary";
import { DateFieldGranularityPicker } from "./DateFieldGranularityPicker";
import { MetricFiltersEditor } from "./MetricFiltersEditor";
import { metricDefinitionFormJsonLabels } from "./json/metric-definition-json-labels";
import { MetricDefinitionJsonToolbar } from "./json/MetricDefinitionJsonToolbar";
import type { MetricFormStateImportResult } from "./json/export-metric-form-state";
import {
  buildEntityFieldOptions,
  buildMetricSummaryContext,
  canShowMetricSummary,
  getInitialAggregationFromMetric,
  getNumericFieldNames,
  inferDefaultValueDisplayFormat,
  listDateFieldsInKeys,
  mergeFieldsDependencyWithFilters,
  metricFiltersToEditorRows,
  normalizeMetricFiltersForSave,
  METRIC_OPERATIONS,
  operationRequiresNumericField,
  pruneDateFieldGranularity,
  validateClientDateFieldGranularity,
  type MetricFilterEditorRow,
  type MetricOperation,
} from "./metric-field-utils";
import type {
  MetricDateGranularity,
  MetricValueDisplayFormat,
} from "@repo/metrics-engine/browser";

interface MetricDefinitionEditorProps {
  readonly metric: MetricDefinitionRecord | null;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canBackfill: boolean;
  readonly onSaved: (metric: MetricDefinitionRecord) => void;
  readonly onCancel: () => void;
}

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

export function MetricDefinitionEditor({
  metric,
  canCreate,
  canUpdate,
  canBackfill,
  onSaved,
  onCancel,
}: MetricDefinitionEditorProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();
  const isCreate = metric === null;
  const metricAggregation = getInitialAggregationFromMetric(metric);

  const [name, setName] = useState(metric?.name ?? "");
  const [description, setDescription] = useState(metric?.description ?? "");
  const [sourceModel, setSourceModel] = useState(metric?.sourceModel ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">(
    metric?.status ?? "ACTIVE",
  );
  const [aggregationOperation, setAggregationOperation] =
    useState<MetricOperation>(metricAggregation.operation);
  const [aggregationField, setAggregationField] = useState(
    metricAggregation.field,
  );
  const [fieldsDependency, setFieldsDependency] = useState<readonly string[]>(
    metric?.fieldsDependency ?? [],
  );
  const [filterRows, setFilterRows] = useState<
    readonly MetricFilterEditorRow[]
  >(() => metricFiltersToEditorRows(metric?.filters ?? []));
  const [groupBy, setGroupBy] = useState<readonly string[]>(
    metric?.groupBy ?? [],
  );
  const [dimensions, setDimensions] = useState<readonly string[]>(
    metric?.dimensions ?? [],
  );
  const [dateFieldGranularity, setDateFieldGranularity] = useState<
    Record<string, MetricDateGranularity>
  >(metric?.dateFieldGranularity ?? {});
  const [valueDisplayFormat, setValueDisplayFormat] =
    useState<MetricValueDisplayFormat>(
      metric?.valueDisplayFormat ??
        inferDefaultValueDisplayFormat(
          entities.find(
            (entity) => entity.name === (metric?.sourceModel ?? ""),
          ),
          getInitialAggregationFromMetric(metric).field,
        ),
    );
  const [isSaving, setIsSaving] = useState(false);

  const selectedEntity = entities.find((entity) => entity.name === sourceModel);
  const selectedDateFields = useMemo(
    () => listDateFieldsInKeys(selectedEntity, groupBy, dimensions),
    [selectedEntity, groupBy, dimensions],
  );

  function handleGroupByChange(nextGroupBy: readonly string[]) {
    setGroupBy(nextGroupBy);
    setDateFieldGranularity((current) =>
      pruneDateFieldGranularity(
        current,
        nextGroupBy,
        dimensions,
        selectedEntity,
      ),
    );
  }

  function handleDimensionsChange(nextDimensions: readonly string[]) {
    setDimensions(nextDimensions);
    setDateFieldGranularity((current) =>
      pruneDateFieldGranularity(
        current,
        groupBy,
        nextDimensions,
        selectedEntity,
      ),
    );
  }

  const entityOptions = useMemo(
    () =>
      entities.map((entity) => ({
        name: entity.name,
        label: getEntityLabel(entity),
      })),
    [entities],
  );

  const numericFieldOptions = useMemo(
    () => getNumericFieldNames(selectedEntity),
    [selectedEntity],
  );
  const fieldSelectOptions = useMemo(
    () => buildEntityFieldOptions(selectedEntity),
    [selectedEntity],
  );
  const requiresNumericField =
    operationRequiresNumericField(aggregationOperation);

  const summaryFilters = useMemo(() => {
    const normalized = normalizeMetricFiltersForSave(
      filterRows,
      selectedEntity,
    );
    return "filters" in normalized ? normalized.filters : [];
  }, [filterRows, selectedEntity]);

  const summaryContext = useMemo(() => {
    if (
      !canShowMetricSummary({
        name,
        sourceModel,
        operation: aggregationOperation,
        aggregationField,
      })
    ) {
      return null;
    }

    return buildMetricSummaryContext({
      name,
      description,
      sourceModel,
      entity: selectedEntity,
      operation: aggregationOperation,
      aggregationField,
      fieldsDependency,
      filters: summaryFilters,
      groupBy,
      dimensions,
      dateFieldGranularity,
      valueDisplayFormat,
      targetCollection: metric?.target.collection,
      isCreate,
    });
  }, [
    name,
    description,
    sourceModel,
    selectedEntity,
    aggregationOperation,
    aggregationField,
    fieldsDependency,
    summaryFilters,
    groupBy,
    dimensions,
    dateFieldGranularity,
    valueDisplayFormat,
    metric?.target.collection,
    isCreate,
  ]);

  function handleOperationChange(nextOperation: MetricOperation) {
    setAggregationOperation(nextOperation);
    if (!operationRequiresNumericField(nextOperation)) {
      setAggregationField("");
      return;
    }

    if (aggregationField && !numericFieldOptions.includes(aggregationField)) {
      setAggregationField("");
    }
  }

  function buildAggregations():
    | readonly [{ readonly operation: "COUNT" }]
    | readonly [{ readonly field: string; readonly operation: "SUM" | "AVG" }] {
    if (aggregationOperation === "COUNT") {
      return [{ operation: "COUNT" }];
    }

    return [
      {
        field: aggregationField.trim(),
        operation: aggregationOperation,
      },
    ];
  }

  function resolveFieldsDependency(
    aggregations: ReturnType<typeof buildAggregations>,
  ): readonly string[] {
    if (fieldsDependency.length > 0) {
      return fieldsDependency;
    }

    if (aggregations[0]?.operation === "COUNT") {
      return [];
    }

    return [aggregationField.trim()];
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isCreate && !canCreate) return;
    if (!isCreate && !canUpdate) return;

    if (requiresNumericField && !aggregationField.trim()) {
      toast.error(t("metrics.validationRequired"));
      return;
    }

    const aggregations = buildAggregations();
    const resolvedFieldsDependency = resolveFieldsDependency(aggregations);
    if (
      aggregations[0]?.operation !== "COUNT" &&
      resolvedFieldsDependency.length === 0
    ) {
      toast.error(t("metrics.validationRequired"));
      return;
    }

    const missingDateGranularity = validateClientDateFieldGranularity(
      selectedEntity,
      groupBy,
      dimensions,
      dateFieldGranularity,
    );
    if (missingDateGranularity) {
      toast.error(
        t("metrics.dateGranularity.validationRequired", {
          field: missingDateGranularity,
        }),
      );
      return;
    }

    const normalizedFilters = normalizeMetricFiltersForSave(
      filterRows,
      selectedEntity,
    );
    if ("error" in normalizedFilters) {
      toast.error(
        t("metrics.filters.validationRequired", {
          field: normalizedFilters.error,
        }),
      );
      return;
    }

    setIsSaving(true);
    const resolvedDateFieldGranularity = pruneDateFieldGranularity(
      dateFieldGranularity,
      groupBy,
      dimensions,
      selectedEntity,
    );
    const resolvedFilters = normalizedFilters.filters;
    const mergedFieldsDependency = mergeFieldsDependencyWithFilters(
      resolvedFieldsDependency,
      resolvedFilters,
    );
    try {
      const saved = isCreate
        ? await createMetricDefinition({
            name: name.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            sourceModel,
            filters: [...resolvedFilters],
            groupBy: [...groupBy],
            dimensions: [...dimensions],
            dateFieldGranularity: resolvedDateFieldGranularity,
            valueDisplayFormat,
            aggregations,
            schemaVersionDependency: 1,
            fieldsDependency: [...mergedFieldsDependency],
            status,
            version: 1,
          })
        : await patchMetricDefinition(metric.id, {
            name: name.trim(),
            ...(description.trim()
              ? { description: description.trim() }
              : { description: "" }),
            filters: [...resolvedFilters],
            groupBy: [...groupBy],
            dimensions: [...dimensions],
            dateFieldGranularity: resolvedDateFieldGranularity,
            valueDisplayFormat,
            aggregations,
            fieldsDependency: [...mergedFieldsDependency],
            status,
            version: metric.version + 1,
          });
      onSaved(saved);
      toast.success(t("metrics.saved"));
    } catch (error) {
      toast.error(
        isApiClientError(error) ? error.message : t("metrics.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBackfill() {
    if (!metric || !canBackfill) return;

    try {
      const result = await backfillMetricDefinition(
        metric.id,
        metric.version > 1
          ? {
              previousVersion: metric.version - 1,
              changedDefinitionFields: metric.fieldsDependency,
            }
          : undefined,
      );
      toast.success(
        t("metrics.backfillComplete", {
          count: result.processedEvents ?? result.processedDocuments ?? 0,
        }),
      );
    } catch (error) {
      toast.error(
        isApiClientError(error) ? error.message : t("metrics.backfillFailed"),
      );
    }
  }

  const multiselectLabels = {
    placeholder: t("metrics.multiselect.placeholder"),
    selectedCountLabel: (count: number) =>
      t("metrics.multiselect.selectedCount", { count }),
    searchPlaceholder: t("metrics.multiselect.searchPlaceholder"),
    noResultsLabel: t("metrics.multiselect.noResults"),
    removeAriaLabel: (label: string) =>
      t("metrics.multiselect.removeBadge", { label }),
  };

  const jsonLabels = useMemo(() => metricDefinitionFormJsonLabels(t), [t]);

  function handleJsonImport(imported: MetricFormStateImportResult) {
    setName(imported.name);
    setDescription(imported.description);
    setSourceModel(imported.sourceModel);
    setStatus(imported.status);
    setAggregationOperation(imported.aggregationOperation);
    setAggregationField(imported.aggregationField);
    setFieldsDependency(imported.fieldsDependency);
    setFilterRows([...imported.filterRows]);
    setGroupBy([...imported.groupBy]);
    setDimensions([...imported.dimensions]);
    setDateFieldGranularity({ ...imported.dateFieldGranularity });
    setValueDisplayFormat(imported.valueDisplayFormat);
  }

  return (
    <Form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading level={2}>
          {isCreate ? t("metrics.createTitle") : t("metrics.editTitle")}
        </Heading>
        <MetricDefinitionJsonToolbar
          mode={isCreate ? "create" : "edit"}
          existingName={metric?.name}
          canApply={isCreate ? canCreate : canUpdate}
          labels={jsonLabels}
          formState={{
            name,
            description,
            sourceModel,
            status,
            aggregationOperation,
            aggregationField,
            fieldsDependency,
            filterRows,
            groupBy,
            dimensions,
            dateFieldGranularity,
            valueDisplayFormat,
            version: metric?.version ?? 1,
            schemaVersionDependency: metric?.schemaVersionDependency ?? 1,
          }}
          onImport={handleJsonImport}
        />
      </div>

      <div>
        <FieldLabel htmlFor="metric-name">{t("metrics.name")}</FieldLabel>
        <Input
          id="metric-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <FieldLabel htmlFor="metric-description">
          {t("metrics.descriptionLabel")}
        </FieldLabel>
        <textarea
          id="metric-description"
          className={textareaClassName}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("metrics.descriptionPlaceholder")}
        />
      </div>

      <div>
        <FieldLabel htmlFor="metric-source-model">
          {t("metrics.sourceModel")}
        </FieldLabel>
        <Select
          id="metric-source-model"
          className={selectClassName}
          value={sourceModel}
          onChange={(event) => {
            setSourceModel(event.target.value);
            setAggregationField("");
            setFieldsDependency([]);
            setFilterRows([]);
            setGroupBy([]);
            setDimensions([]);
            setDateFieldGranularity({});
          }}
        >
          <option value="">{t("metrics.selectModel")}</option>
          {entityOptions.map((option) => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <FieldLabel htmlFor="metric-operation">
          {t("metrics.operation")}
        </FieldLabel>
        <Select
          id="metric-operation"
          className={selectClassName}
          value={aggregationOperation}
          onChange={(event) =>
            handleOperationChange(event.target.value as MetricOperation)
          }
        >
          {METRIC_OPERATIONS.map((operation) => (
            <option key={operation} value={operation}>
              {t(`metrics.operations.${operation}`)}
            </option>
          ))}
        </Select>
      </div>

      {requiresNumericField ? (
        sourceModel && numericFieldOptions.length > 0 ? (
          <div>
            <FieldLabel htmlFor="metric-aggregation-field">
              {t("metrics.aggregationField")}
            </FieldLabel>
            <Select
              id="metric-aggregation-field"
              className={selectClassName}
              value={aggregationField}
              onChange={(event) => {
                const nextField = event.target.value;
                setAggregationField(nextField);
                if (isCreate) {
                  setValueDisplayFormat(
                    inferDefaultValueDisplayFormat(selectedEntity, nextField),
                  );
                }
                if (
                  fieldsDependency.length === 0 &&
                  nextField &&
                  (aggregationOperation === "SUM" ||
                    aggregationOperation === "AVG")
                ) {
                  setFieldsDependency([nextField]);
                }
              }}
            >
              <option value="">{t("metrics.selectField")}</option>
              {numericFieldOptions.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </Select>
          </div>
        ) : sourceModel ? (
          <Alert>{t("metrics.noNumericFields")}</Alert>
        ) : (
          <Alert>{t("metrics.selectModelFirst")}</Alert>
        )
      ) : (
        <Text className="text-muted-foreground text-sm">
          {t("metrics.countDocumentsHint")}
        </Text>
      )}

      <div>
        <MetricFieldLabel
          htmlFor="metric-fields-dependency"
          label={t("metrics.fieldsDependency")}
          fieldKey="fieldsDependency"
        />
        <SearchableMultiSelectDropdown
          options={fieldSelectOptions}
          selected={fieldsDependency}
          onChange={setFieldsDependency}
          disabled={!sourceModel}
          ariaLabel={t("metrics.fieldsDependency")}
          {...multiselectLabels}
        />
      </div>

      <MetricFiltersEditor
        entity={selectedEntity}
        rows={filterRows}
        disabled={!sourceModel}
        onChange={setFilterRows}
      />

      <div>
        <MetricFieldLabel
          htmlFor="metric-group-by"
          label={t("metrics.groupBy")}
          fieldKey="groupBy"
        />
        <SearchableMultiSelectDropdown
          options={fieldSelectOptions}
          selected={groupBy}
          onChange={handleGroupByChange}
          disabled={!sourceModel}
          ariaLabel={t("metrics.groupBy")}
          {...multiselectLabels}
        />
      </div>

      <div>
        <MetricFieldLabel
          htmlFor="metric-dimensions"
          label={t("metrics.dimensions")}
          fieldKey="dimensions"
        />
        <SearchableMultiSelectDropdown
          options={fieldSelectOptions}
          selected={dimensions}
          onChange={handleDimensionsChange}
          disabled={!sourceModel}
          ariaLabel={t("metrics.dimensions")}
          {...multiselectLabels}
        />
      </div>

      {selectedDateFields.length > 0 ? (
        <DateFieldGranularityPicker
          entity={selectedEntity}
          groupBy={groupBy}
          dimensions={dimensions}
          dateFieldGranularity={dateFieldGranularity}
          onChange={setDateFieldGranularity}
        />
      ) : null}

      <div>
        <FieldLabel htmlFor="metric-value-display-format">
          {t("metrics.valueDisplayFormat.label")}
        </FieldLabel>
        <Select
          id="metric-value-display-format"
          className={selectClassName}
          value={valueDisplayFormat}
          onChange={(event) =>
            setValueDisplayFormat(
              event.target.value as MetricValueDisplayFormat,
            )
          }
        >
          <option value="number">
            {t("metrics.valueDisplayFormat.number")}
          </option>
          <option value="currency">
            {t("metrics.valueDisplayFormat.currency")}
          </option>
        </Select>
      </div>

      <div>
        <FieldLabel htmlFor="metric-status">{t("metrics.status")}</FieldLabel>
        <Select
          id="metric-status"
          className={selectClassName}
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "ACTIVE" | "PAUSED")
          }
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
        </Select>
      </div>

      {!isCreate ? (
        <Text className="text-muted-foreground text-sm">
          {t("metrics.versionLabel", { version: metric.version })}
        </Text>
      ) : null}

      {summaryContext ? (
        <MetricDefinitionSummary context={summaryContext} />
      ) : null}

      <div className="flex flex-col gap-3">
        {!isEnvironmentReady ? (
          <IndexEnvironmentBlockedNotice
            feature="backfill"
            buildingCollections={buildingCollections}
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSaving || !isEnvironmentReady}>
            {isSaving ? t("metrics.saving") : t("metrics.saveAction")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("metrics.cancel")}
          </Button>
          {!isCreate && canBackfill ? (
            <Button
              type="button"
              variant="outline"
              disabled={!isEnvironmentReady}
              onClick={() => void handleBackfill()}
            >
              {t("metrics.runBackfill")}
            </Button>
          ) : null}
        </div>
      </div>
    </Form>
  );
}
