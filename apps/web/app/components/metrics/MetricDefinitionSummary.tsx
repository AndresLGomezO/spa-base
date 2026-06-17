import { useTranslation } from "react-i18next";

import { Text } from "@repo/ui";

import {
  formatFieldList,
  formatSummaryExampleValues,
  operationRequiresNumericField,
  type MetricSummaryContext,
} from "./metric-field-utils";

interface MetricDefinitionSummaryProps {
  readonly context: MetricSummaryContext;
}

export function MetricDefinitionSummary({
  context,
}: MetricDefinitionSummaryProps) {
  const { t } = useTranslation("common");

  const operationLabel = t(`metrics.operations.${context.operation}`);
  const resolvedFieldsDependency =
    context.fieldsDependency.length > 0
      ? formatFieldList(context.fieldsDependency)
      : operationRequiresNumericField(context.operation)
        ? context.aggregationField
        : t("metrics.summary.anyFieldChange");

  const groupByText =
    context.groupBy.length > 0
      ? formatFieldList(context.groupBy)
      : t("metrics.summary.noGrouping");

  const dimensionsText =
    context.dimensions.length > 0
      ? formatFieldList(context.dimensions)
      : t("metrics.summary.noDimensions");

  const filtersText =
    context.filters.length > 0
      ? context.filtersSummary
      : t("metrics.summary.noFilters");

  const storagePath = context.isCreate
    ? t("metrics.summary.storagePathCreate")
    : t("metrics.summary.storagePathEdit", {
        collection: context.targetCollection ?? "…",
      });

  const exampleValues = formatSummaryExampleValues(
    context.operation,
    context.aggregationField,
    context.groupBy,
    context.dimensions,
  );

  return (
    <div className="bg-muted/40 space-y-3 rounded-lg border p-4">
      <Text className="font-medium">{t("metrics.summary.title")}</Text>
      <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
        <li>
          {operationRequiresNumericField(context.operation)
            ? t("metrics.summary.whatCreatingNumeric", {
                operation: operationLabel,
                field: context.aggregationField,
                model: context.sourceModelLabel,
              })
            : t("metrics.summary.whatCreatingCount", {
                model: context.sourceModelLabel,
              })}
        </li>
        {context.description ? (
          <li>
            {t("metrics.summary.description", { text: context.description })}
          </li>
        ) : null}
        <li>
          {t("metrics.summary.whenUpdates", {
            fields: resolvedFieldsDependency,
          })}
        </li>
        <li>{t("metrics.summary.filters", { filters: filtersText })}</li>
        <li>{t("metrics.summary.groupBy", { fields: groupByText })}</li>
        <li>{t("metrics.summary.dimensions", { fields: dimensionsText })}</li>
        {context.selectedDateFields.length > 0 &&
        Object.keys(context.dateFieldGranularity).length > 0 ? (
          <li>
            {t("metrics.summary.dateGranularity", {
              fields: context.selectedDateFields
                .filter((field) => context.dateFieldGranularity[field])
                .map(
                  (field) =>
                    `${field}: ${t(`metrics.dateGranularity.options.${context.dateFieldGranularity[field]}`)}`,
                )
                .join(", "),
            })}
          </li>
        ) : null}
        <li>
          {t("metrics.summary.valueDisplayFormat", {
            format: t(
              `metrics.valueDisplayFormat.${context.valueDisplayFormat}`,
            ),
          })}
        </li>
        <li>{storagePath}</li>
        <li>{t("metrics.summary.exampleRow", { values: exampleValues })}</li>
      </ul>
    </div>
  );
}
