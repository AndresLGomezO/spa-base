import type { ReactNode } from "react";
import type {
  CardSlotBinding,
  SerializableEntityDefinition,
} from "@repo/entities";
import { isCardMetricKpiBinding } from "@repo/entities";
import {
  CardFieldBadge,
  CardFieldCurrency,
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
  resolveEntityFieldPath,
  resolveEntityFieldRootName,
} from "./resolve-entity-field-path";
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

  const rootField = resolveEntityFieldRootName(binding.fieldPath);
  const rawValue = resolveEntityFieldPath(
    item,
    binding.fieldPath,
    definition,
    getOneToManyCellValue,
  );
  const displayMeta = resolveLayoutSlotDisplayMeta(
    binding.fieldPath,
    definition,
    getDefinition,
  );
  const label =
    binding.label ??
    (binding.component === "labeled-text" || binding.showLabel
      ? resolveLayoutSlotLabel(binding.fieldPath, definition, getDefinition)
      : undefined);

  if (binding.component === "image") {
    return (
      <EntityLayoutImageField
        item={item}
        fieldPath={binding.fieldPath}
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
        className={binding.className}
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
      value={formattedValue}
      className={binding.className}
      textSize={binding.textSize}
      textThin={binding.textThin}
      textBold={binding.textBold}
      textItalic={binding.textItalic}
      textUnderline={binding.textUnderline}
    />
  );
}
