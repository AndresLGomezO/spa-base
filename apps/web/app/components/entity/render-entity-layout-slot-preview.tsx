import type { ReactNode } from "react";
import type {
  CardSlotBinding,
  SerializableEntityDefinition,
} from "@repo/entities";
import { isCardMetricKpiBinding } from "@repo/entities";
import {
  CardFieldBadge,
  CardFieldCurrency,
  CardFieldDate,
  CardFieldValue,
  formatDisplayValue,
  resolveBadgeVariant,
  resolveCurrencyTone,
} from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { resolveEntityCellValue } from "./resolve-entity-cell-value";
import {
  resolveLayoutSlotDisplayMeta,
  resolveLayoutSlotLabel,
} from "./resolve-layout-slot-display";
import {
  resolveEntityFieldRootName,
} from "./resolve-entity-field-path";
import { resolveLayoutFieldBinding } from "./resolve-entity-layout-field-binding";
import { MetricValueDisplay } from "../metrics/MetricValueDisplay.js";
import { EntityLayoutImageField } from "./EntityLayoutImageField.js";

export function renderEntityLayoutSlotPreview(options: {
  readonly item: Record<string, unknown>;
  readonly binding: CardSlotBinding;
  readonly definition: SerializableEntityDefinition;
  readonly locale: string;
  readonly getOneToManyCellValue?: (
    recordId: string,
    columnName: string,
  ) => string | null;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly listFilters?: Readonly<Record<string, readonly string[]>>;
  readonly routeParams?: Readonly<Record<string, string | undefined>>;
}): ReactNode {
  const {
    item,
    binding,
    definition,
    locale,
    getOneToManyCellValue = () => null,
    getDefinition,
    listFilters,
    routeParams,
  } = options;

  if (isCardMetricKpiBinding(binding)) {
    return (
      <MetricValueDisplay
        metricDefinitionId={binding.metricDefinitionId}
        groupBindings={binding.groupBindings}
        dimensionBindings={binding.dimensionBindings}
        label={binding.label}
        context={{ record: item, listFilters, routeParams }}
      />
    );
  }

  if (binding.staticText !== undefined) {
    return (
      <CardFieldValue
        label={binding.label}
        showLabel={binding.showLabel}
        labelPosition={binding.labelPosition}
        value={binding.staticText}
        allowEmpty
        className={binding.className}
        textSize={binding.textSize}
        textColor={binding.textColor}
        textThin={binding.textThin}
        textBold={binding.textBold}
        textItalic={binding.textItalic}
        textUnderline={binding.textUnderline}
      />
    );
  }

  const resolvedField = resolveLayoutFieldBinding({
    item,
    fieldPath: binding.fieldPath,
    fallbackFieldPaths: binding.fallbackFieldPaths,
    component: binding.component,
    definition,
    getOneToManyCellValue,
  });
  const rootField = resolveEntityFieldRootName(resolvedField.fieldPath);
  const rawValue = resolvedField.rawValue;
  const displayMeta = resolveLayoutSlotDisplayMeta(
    resolvedField.fieldPath,
    definition,
    getDefinition,
  );
  const label =
    binding.label ??
    (binding.component === "labeled-text" || binding.showLabel
      ? resolveLayoutSlotLabel(resolvedField.fieldPath, definition, getDefinition)
      : undefined);

  if (binding.component === "image") {
    return (
      <EntityLayoutImageField
        item={item}
        fieldPath={resolvedField.fieldPath}
        rawValue={rawValue}
        definition={definition}
        className={binding.className}
        imageSize={binding.imageSize}
        getDefinition={getDefinition}
      />
    );
  }

  if (binding.component === "badge") {
    const formattedBadgeValue = formatDisplayValue(rawValue, {
      fieldType: displayMeta.fieldType,
      displayFormat: displayMeta.displayFormat,
      dateDisplayFormat: displayMeta.dateDisplayFormat,
      fieldName: rootField,
      locale,
    });

    return (
      <CardFieldBadge
        value={formattedBadgeValue}
        variant={resolveBadgeVariant(
          rawValue,
          binding.badgeVariants,
          formattedBadgeValue,
        )}
        className={binding.className}
      />
    );
  }

  if (binding.component === "currency") {
    return (
      <CardFieldCurrency
        amount={formatDisplayValue(rawValue, {
          fieldType: displayMeta.fieldType ?? "number",
          displayFormat: "currency",
          fieldName: rootField,
          locale,
        })}
        currency={
          definition.fields.currencyId
            ? resolveEntityCellValue(
                item,
                "currencyId",
                definition,
                getOneToManyCellValue,
              )
            : undefined
        }
        tone={resolveCurrencyTone(rawValue)}
        label={label}
        showLabel={binding.showLabel}
        labelPosition={binding.labelPosition}
        className={binding.className}
      />
    );
  }

  if (binding.component === "date") {
    return (
      <CardFieldDate
        value={rawValue}
        dateDisplayFormat={
          binding.dateDisplayFormat ?? displayMeta.dateDisplayFormat ?? "datetime"
        }
        locale={locale}
        label={label}
        showLabel={binding.showLabel}
        labelPosition={binding.labelPosition}
        className={binding.className}
        textSize={binding.textSize}
        textThin={binding.textThin}
        textBold={binding.textBold}
        textItalic={binding.textItalic}
        textUnderline={binding.textUnderline}
      />
    );
  }

  const formattedValue = formatDisplayValue(rawValue, {
    fieldType: displayMeta.fieldType,
    displayFormat: displayMeta.displayFormat,
    dateDisplayFormat: displayMeta.dateDisplayFormat,
    fieldName: rootField,
    locale,
  });

  return (
    <CardFieldValue
      label={label}
      showLabel={binding.component === "labeled-text" || binding.showLabel}
      labelPosition={binding.labelPosition}
      value={formattedValue}
      className={binding.className}
      textSize={binding.textSize}
      textColor={binding.textColor}
      textThin={binding.textThin}
      textBold={binding.textBold}
      textItalic={binding.textItalic}
      textUnderline={binding.textUnderline}
    />
  );
}
