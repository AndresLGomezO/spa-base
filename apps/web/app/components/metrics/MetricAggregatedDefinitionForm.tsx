import type { MetricValueDisplayFormat } from "@repo/metrics-engine/browser";
import {
  Alert,
  FieldLabel,
  SearchableMultiSelectDropdown,
  Text,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import type { MetricDefinitionDraft } from "./metric-definition-draft.js";
import { DateFieldGranularityPicker } from "./DateFieldGranularityPicker.js";
import { MetricFieldLabel } from "./MetricFieldHelp.js";
import { MetricFiltersEditor } from "./MetricFiltersEditor.js";
import {
  buildEntityFieldOptions,
  getNumericFieldNames,
  inferDefaultValueDisplayFormat,
  listDateFieldsInKeys,
  METRIC_OPERATIONS,
  operationRequiresNumericField,
  pruneDateFieldGranularity,
  type MetricOperation,
} from "./metric-field-utils.js";
import { selectClassName } from "./metric-computation-shared.js";

interface MetricAggregatedDefinitionFormProps {
  readonly draft: Pick<
    MetricDefinitionDraft,
    | "sourceModel"
    | "sourceType"
    | "aggregationOperation"
    | "aggregationField"
    | "fieldsDependency"
    | "filterRows"
    | "groupBy"
    | "dimensions"
    | "dateFieldGranularity"
    | "valueDisplayFormat"
  >;
  readonly onChange: (patch: Partial<MetricDefinitionDraft>) => void;
  readonly isCreate: boolean;
  readonly readOnly?: boolean;
}

const VALUE_DISPLAY_FORMATS: readonly MetricValueDisplayFormat[] = [
  "number",
  "currency",
  "percent",
];

export function MetricAggregatedDefinitionForm({
  draft,
  onChange,
  isCreate,
  readOnly = false,
}: MetricAggregatedDefinitionFormProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();

  const selectedEntity = entities.find(
    (entity) => entity.name === draft.sourceModel,
  );
  const numericFieldOptions = useMemo(
    () => getNumericFieldNames(selectedEntity),
    [selectedEntity],
  );
  const fieldSelectOptions = useMemo(
    () => buildEntityFieldOptions(selectedEntity),
    [selectedEntity],
  );
  const requiresNumericField = operationRequiresNumericField(
    draft.aggregationOperation,
  );
  const selectedDateFields = useMemo(
    () => listDateFieldsInKeys(selectedEntity, draft.groupBy, draft.dimensions),
    [selectedEntity, draft.groupBy, draft.dimensions],
  );

  const multiselectLabels = {
    placeholder: t("metrics.multiselect.placeholder"),
    selectedCountLabel: (count: number) =>
      t("metrics.multiselect.selectedCount", { count }),
    searchPlaceholder: t("metrics.multiselect.searchPlaceholder"),
    noResultsLabel: t("metrics.multiselect.noResults"),
    removeAriaLabel: (label: string) =>
      t("metrics.multiselect.removeBadge", { label }),
  };

  function handleOperationChange(nextOperation: MetricOperation) {
    if (!operationRequiresNumericField(nextOperation)) {
      onChange({
        aggregationOperation: nextOperation,
        aggregationField: "",
      });
      return;
    }

    if (
      draft.aggregationField &&
      !numericFieldOptions.includes(draft.aggregationField)
    ) {
      onChange({
        aggregationOperation: nextOperation,
        aggregationField: "",
      });
      return;
    }

    onChange({ aggregationOperation: nextOperation });
  }

  function handleGroupByChange(nextGroupBy: readonly string[]) {
    onChange({
      groupBy: nextGroupBy,
      dateFieldGranularity: pruneDateFieldGranularity(
        draft.dateFieldGranularity,
        nextGroupBy,
        draft.dimensions,
        selectedEntity,
      ),
    });
  }

  function handleDimensionsChange(nextDimensions: readonly string[]) {
    onChange({
      dimensions: nextDimensions,
      dateFieldGranularity: pruneDateFieldGranularity(
        draft.dateFieldGranularity,
        draft.groupBy,
        nextDimensions,
        selectedEntity,
      ),
    });
  }

  function handleAggregationFieldChange(nextField: string) {
    if (isCreate) {
      onChange({
        aggregationField: nextField,
        valueDisplayFormat: inferDefaultValueDisplayFormat(
          selectedEntity,
          nextField,
        ),
        ...(draft.fieldsDependency.length === 0 &&
        nextField &&
        (draft.aggregationOperation === "SUM" ||
          draft.aggregationOperation === "AVG")
          ? { fieldsDependency: [nextField] as const }
          : {}),
      });
      return;
    }

    if (
      draft.fieldsDependency.length === 0 &&
      nextField &&
      (draft.aggregationOperation === "SUM" ||
        draft.aggregationOperation === "AVG")
    ) {
      onChange({
        aggregationField: nextField,
        fieldsDependency: [nextField],
      });
      return;
    }

    onChange({ aggregationField: nextField });
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="metric-aggregated-operation">
          {t("metrics.operation")}
        </FieldLabel>
        <Select
          id="metric-aggregated-operation"
          className={selectClassName}
          value={draft.aggregationOperation}
          disabled={readOnly}
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
        draft.sourceModel && numericFieldOptions.length > 0 ? (
          <div>
            <FieldLabel htmlFor="metric-aggregated-aggregation-field">
              {t("metrics.aggregationField")}
            </FieldLabel>
            <Select
              id="metric-aggregated-aggregation-field"
              className={selectClassName}
              value={draft.aggregationField}
              disabled={readOnly}
              onChange={(event) =>
                handleAggregationFieldChange(event.target.value)
              }
            >
              <option value="">{t("metrics.selectField")}</option>
              {numericFieldOptions.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </Select>
          </div>
        ) : draft.sourceModel ? (
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
          htmlFor="metric-aggregated-fields-dependency"
          label={t("metrics.fieldsDependency")}
          fieldKey="fieldsDependency"
        />
        <SearchableMultiSelectDropdown
          options={fieldSelectOptions}
          selected={draft.fieldsDependency}
          onChange={(fieldsDependency) => onChange({ fieldsDependency })}
          disabled={readOnly || !draft.sourceModel}
          ariaLabel={t("metrics.fieldsDependency")}
          {...multiselectLabels}
        />
      </div>

      <MetricFiltersEditor
        entity={selectedEntity}
        rows={draft.filterRows}
        disabled={
          readOnly || !draft.sourceModel || draft.sourceType === "query"
        }
        onChange={(filterRows) => onChange({ filterRows })}
      />

      <div>
        <MetricFieldLabel
          htmlFor="metric-aggregated-group-by"
          label={t("metrics.groupBy")}
          fieldKey="groupBy"
        />
        <SearchableMultiSelectDropdown
          options={fieldSelectOptions}
          selected={draft.groupBy}
          onChange={handleGroupByChange}
          disabled={readOnly || !draft.sourceModel}
          ariaLabel={t("metrics.groupBy")}
          {...multiselectLabels}
        />
      </div>

      <div>
        <MetricFieldLabel
          htmlFor="metric-aggregated-dimensions"
          label={t("metrics.dimensions")}
          fieldKey="dimensions"
        />
        <SearchableMultiSelectDropdown
          options={fieldSelectOptions}
          selected={draft.dimensions}
          onChange={handleDimensionsChange}
          disabled={readOnly || !draft.sourceModel}
          ariaLabel={t("metrics.dimensions")}
          {...multiselectLabels}
        />
      </div>

      {selectedDateFields.length > 0 ? (
        <DateFieldGranularityPicker
          entity={selectedEntity}
          groupBy={draft.groupBy}
          dimensions={draft.dimensions}
          dateFieldGranularity={draft.dateFieldGranularity}
          onChange={(dateFieldGranularity) =>
            onChange({ dateFieldGranularity })
          }
        />
      ) : null}

      <div>
        <FieldLabel htmlFor="metric-aggregated-value-display-format">
          {t("metrics.valueDisplayFormat.label")}
        </FieldLabel>
        <Select
          id="metric-aggregated-value-display-format"
          className={selectClassName}
          value={draft.valueDisplayFormat}
          disabled={readOnly}
          onChange={(event) =>
            onChange({
              valueDisplayFormat: event.target
                .value as MetricValueDisplayFormat,
            })
          }
        >
          {VALUE_DISPLAY_FORMATS.map((format) => (
            <option key={format} value={format}>
              {t(`metrics.valueDisplayFormat.${format}`, {
                defaultValue: format,
              })}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
