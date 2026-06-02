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
import { MetricFieldLabel } from "./MetricFieldHelp";
import { MetricDefinitionSummary } from "./MetricDefinitionSummary";
import {
  buildEntityFieldOptions,
  buildMetricSummaryContext,
  canShowMetricSummary,
  getInitialAggregationFromMetric,
  getNumericFieldNames,
  METRIC_OPERATIONS,
  operationRequiresNumericField,
  type MetricOperation,
} from "./metric-field-utils";

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
  const [groupBy, setGroupBy] = useState<readonly string[]>(
    metric?.groupBy ?? [],
  );
  const [dimensions, setDimensions] = useState<readonly string[]>(
    metric?.dimensions ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);

  const entityOptions = useMemo(
    () =>
      entities.map((entity) => ({
        name: entity.name,
        label: getEntityLabel(entity),
      })),
    [entities],
  );

  const selectedEntity = entities.find((entity) => entity.name === sourceModel);
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
      groupBy,
      dimensions,
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
    groupBy,
    dimensions,
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

    setIsSaving(true);
    try {
      const saved = isCreate
        ? await createMetricDefinition({
            name: name.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            sourceModel,
            filters: [],
            groupBy: [...groupBy],
            dimensions: [...dimensions],
            aggregations,
            schemaVersionDependency: 1,
            fieldsDependency: [...resolvedFieldsDependency],
            status,
            version: 1,
          })
        : await patchMetricDefinition(metric.id, {
            name: name.trim(),
            ...(description.trim()
              ? { description: description.trim() }
              : { description: "" }),
            filters: [],
            groupBy: [...groupBy],
            dimensions: [...dimensions],
            aggregations,
            fieldsDependency: [...resolvedFieldsDependency],
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

  return (
    <Form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <Heading level={2}>
        {isCreate ? t("metrics.createTitle") : t("metrics.editTitle")}
      </Heading>

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
        <select
          id="metric-source-model"
          className={selectClassName}
          value={sourceModel}
          onChange={(event) => {
            setSourceModel(event.target.value);
            setAggregationField("");
            setFieldsDependency([]);
            setGroupBy([]);
            setDimensions([]);
          }}
        >
          <option value="">{t("metrics.selectModel")}</option>
          {entityOptions.map((option) => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel htmlFor="metric-operation">
          {t("metrics.operation")}
        </FieldLabel>
        <select
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
        </select>
      </div>

      {requiresNumericField ? (
        sourceModel && numericFieldOptions.length > 0 ? (
          <div>
            <FieldLabel htmlFor="metric-aggregation-field">
              {t("metrics.aggregationField")}
            </FieldLabel>
            <select
              id="metric-aggregation-field"
              className={selectClassName}
              value={aggregationField}
              onChange={(event) => {
                const nextField = event.target.value;
                setAggregationField(nextField);
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
            </select>
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

      <div>
        <MetricFieldLabel
          htmlFor="metric-group-by"
          label={t("metrics.groupBy")}
          fieldKey="groupBy"
        />
        <SearchableMultiSelectDropdown
          options={fieldSelectOptions}
          selected={groupBy}
          onChange={setGroupBy}
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
          onChange={setDimensions}
          disabled={!sourceModel}
          ariaLabel={t("metrics.dimensions")}
          {...multiselectLabels}
        />
      </div>

      <div>
        <FieldLabel htmlFor="metric-status">{t("metrics.status")}</FieldLabel>
        <select
          id="metric-status"
          className={selectClassName}
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "ACTIVE" | "PAUSED")
          }
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
        </select>
      </div>

      {!isCreate ? (
        <Text className="text-muted-foreground text-sm">
          {t("metrics.versionLabel", { version: metric.version })}
        </Text>
      ) : null}

      {summaryContext ? (
        <MetricDefinitionSummary context={summaryContext} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t("metrics.saving") : t("metrics.saveAction")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("metrics.cancel")}
        </Button>
        {!isCreate && canBackfill ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleBackfill()}
          >
            {t("metrics.runBackfill")}
          </Button>
        ) : null}
      </div>
    </Form>
  );
}
