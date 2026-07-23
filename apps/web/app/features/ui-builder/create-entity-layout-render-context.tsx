import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";
import { formatDisplayValue } from "@repo/ui";
import type { TFunction } from "i18next";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { createMetricWidgetRenderer } from "./create-metric-widget-renderer";
import { createQueryViewerRenderer } from "./create-query-viewer-renderer";
import { resolveEntityCellValue } from "../../components/entity/resolve-entity-cell-value";
import { resolveEntityFieldPath } from "../../components/entity/resolve-entity-field-path";
import {
  readEntityFileDownloadUrl,
  resolveEntityLayoutFieldDefaultImageSrc,
  resolveEntityLayoutImagePlaceholderSrc,
  shouldFetchEntityLayoutImageDownload,
} from "../../components/entity/resolve-entity-layout-image-src";
import {
  resolveLayoutSlotDisplayMeta,
  resolveLayoutSlotLabel,
} from "../../components/entity/resolve-layout-slot-display";
import { EntityLayoutImageField } from "../../components/entity/EntityLayoutImageField";
import { LayoutLucideIcon } from "../../components/entity/LayoutLucideIcon";
import { MetricDerivedValueDisplay } from "../../components/metrics/MetricDerivedValueDisplay";
import { MetricValueDisplay } from "../../components/metrics/MetricValueDisplay";
import { ChartComponentSlot } from "./ChartComponentSlot.js";
import { readLayoutStaticImageUrl } from "@repo/entities";

import { isEntityFileReferenceWithDownload } from "../../lib/entity-file-client";
import { parseLayoutStaticImageRef } from "../../lib/layout-static-image";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { createComponentClickContextHelpers } from "./create-component-click-context-helpers.js";

export function createEntityLayoutRenderContext(options: {
  readonly item: Record<string, unknown>;
  readonly definition: SerializableEntityDefinition;
  readonly locale: string;
  readonly getOneToManyCellValue?: (
    recordId: string,
    columnName: string,
  ) => string | null;
  readonly getOneToManyRelationSubfieldValue?: (
    recordId: string,
    fieldPath: string,
  ) => unknown;
  readonly getManyToOneRelationSubfieldValue?: (
    recordId: string,
    fieldPath: string,
  ) => unknown;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly catalogItems?: readonly EntityCatalogEntry[];
  readonly listFilters?: Readonly<Record<string, readonly string[]>>;
  readonly routeParams?: Readonly<Record<string, string | undefined>>;
  readonly dashboardDateFilter?: DashboardDateFilterContextValue;
  /** When true, show the static card placeholder if no field image or default exists. */
  readonly usePreviewPlaceholder?: boolean;
  /** When true, empty field values show the field label as sample text. */
  readonly usePreviewSamples?: boolean;
  readonly t?: TFunction;
  /** When true, relation field links use primary/underline styling. */
  readonly relationLinkAppearance?: boolean;
}): LayoutRenderContext {
  const {
    item,
    definition,
    locale,
    getOneToManyCellValue = () => null,
    getOneToManyRelationSubfieldValue,
    getManyToOneRelationSubfieldValue,
    getDefinition,
    catalogItems = [],
    listFilters,
    routeParams,
    dashboardDateFilter,
    usePreviewPlaceholder = false,
    usePreviewSamples = false,
    t,
    relationLinkAppearance = false,
  } = options;

  const resolvePreviewSampleValue = usePreviewSamples
    ? (fieldPath: string) =>
        resolveLayoutSlotLabel(fieldPath, definition, getDefinition)
    : undefined;

  const resolveField = (path: string) =>
    resolveEntityFieldPath(item, path, definition, getOneToManyCellValue, {
      getDefinition,
      getOneToManyRelationSubfieldValue,
      getManyToOneRelationSubfieldValue,
    });

  return {
    mode: "listItem",
    data: item,
    locale,
    relationLinkAppearance,
    dashboardDateFilter,
    resolveField,
    resolveFieldMeta: (path) =>
      resolveLayoutSlotDisplayMeta(path, definition, getDefinition),
    resolveFieldLabel: (path) =>
      resolveLayoutSlotLabel(path, definition, getDefinition),
    formatFieldDisplayValue: (fieldPath, rawValue) => {
      const rootField = fieldPath.includes(".")
        ? (fieldPath.split(".")[0] ?? fieldPath)
        : fieldPath;
      const fieldMeta = definition.fields[rootField];
      if (
        fieldMeta?.relation?.type === "many-to-one" ||
        fieldMeta?.relation?.type === "one-to-one"
      ) {
        if (!fieldPath.includes(".")) {
          return resolveEntityCellValue(
            item,
            rootField,
            definition,
            getOneToManyCellValue,
            { getDefinition },
          );
        }
      }
      if (
        fieldMeta?.relation?.type === "one-to-many" &&
        !fieldPath.includes(".")
      ) {
        const relatedValue = getOneToManyCellValue(String(item.id), rootField);
        if (relatedValue !== null) {
          return relatedValue;
        }
      }
      const meta = resolveLayoutSlotDisplayMeta(
        fieldPath,
        definition,
        getDefinition,
      );
      return formatDisplayValue(rawValue, {
        fieldType: meta.fieldType,
        displayFormat: meta.displayFormat,
        dateDisplayFormat: meta.dateDisplayFormat,
        fieldName: rootField,
        locale,
      });
    },
    resolvePreviewSampleValue,
    resolveCurrencyCode: () =>
      definition.fields.currencyId
        ? resolveEntityCellValue(
            item,
            "currencyId",
            definition,
            getOneToManyCellValue,
          )
        : undefined,
    isImagePresent: (fieldPath, rawValue) => {
      if (readEntityFileDownloadUrl(rawValue)) {
        return true;
      }
      if (isEntityFileReferenceWithDownload(rawValue)) {
        return true;
      }
      if (typeof rawValue === "string") {
        if (readLayoutStaticImageUrl(rawValue)) {
          return true;
        }
        if (parseLayoutStaticImageRef(rawValue)) {
          return true;
        }
      }
      if (
        shouldFetchEntityLayoutImageDownload({
          item,
          fieldPath,
          rawValue,
          definition,
          getDefinition,
        })
      ) {
        return true;
      }

      if (
        resolveEntityLayoutFieldDefaultImageSrc({
          fieldPath,
          definition,
          getDefinition,
        })
      ) {
        return true;
      }

      if (
        usePreviewPlaceholder &&
        resolveEntityLayoutImagePlaceholderSrc({
          fieldPath,
          definition,
          getDefinition,
        })
      ) {
        return true;
      }

      return false;
    },
    resolveImage: (fieldPath, rawValue, imageOptions) => (
      <EntityLayoutImageField
        item={item}
        fieldPath={fieldPath}
        rawValue={rawValue}
        definition={definition}
        getDefinition={getDefinition}
        primaryFieldPath={imageOptions.primaryFieldPath}
        imageSize={imageOptions.imageSize}
        fillContainer={imageOptions.fillContainer}
        objectFit={imageOptions.objectFit}
        className={imageOptions.className}
        style={imageOptions.style}
        usePreviewPlaceholder={usePreviewPlaceholder}
        expandOnClick={imageOptions.expandOnClick}
      />
    ),
    metricKpiRenderer: (config, presentation) => (
      <MetricValueDisplay
        presentation="inline"
        metricDefinitionId={config.metricDefinitionId}
        groupBindings={config.groupBindings}
        dimensionBindings={config.dimensionBindings}
        parameterBindings={config.parameterBindings}
        queryParameterBindings={config.queryParameterBindings}
        showToneColors={config.showToneColors}
        tonePolarity={config.tonePolarity}
        context={{
          record: item,
          listFilters,
          routeParams,
          dashboardDateFilter,
        }}
        className={presentation?.className}
        style={presentation?.style}
        valueClassName={presentation?.valueClassName}
        valueStyle={presentation?.valueStyle}
        textSize={presentation?.textSize}
        cssText={presentation?.cssText}
      />
    ),
    metricDerivedKpiRenderer: (config, presentation) => (
      <MetricDerivedValueDisplay
        presentation="inline"
        config={config}
        context={{
          record: item,
          listFilters,
          routeParams,
          dashboardDateFilter,
        }}
        className={presentation?.className}
        style={presentation?.style}
        valueClassName={presentation?.valueClassName}
        valueStyle={presentation?.valueStyle}
        textSize={presentation?.textSize}
        cssText={presentation?.cssText}
      />
    ),
    chartRenderer: (config) => (
      <ChartComponentSlot
        config={config}
        context={{
          record: item,
          listFilters,
          routeParams,
          dashboardDateFilter,
        }}
        catalog={catalogItems}
        previewMode={usePreviewSamples}
      />
    ),
    metricWidgetRenderer:
      getDefinition && t
        ? createMetricWidgetRenderer({
            buildLayoutContext: (nestedDefinition, nestedItem, extras) =>
              createEntityLayoutRenderContext({
                item: nestedItem,
                definition: nestedDefinition,
                locale,
                catalogItems,
                getDefinition,
                listFilters,
                routeParams,
                dashboardDateFilter,
                usePreviewPlaceholder,
                usePreviewSamples,
                t,
                getOneToManyRelationSubfieldValue:
                  extras?.getOneToManyRelationSubfieldValue,
                getManyToOneRelationSubfieldValue:
                  extras?.getManyToOneRelationSubfieldValue,
              }),
          })
        : undefined,
    queryViewerRenderer:
      getDefinition && t
        ? createQueryViewerRenderer({
            catalogItems,
            t,
            pageFilterContext: {
              record: item,
              listFilters,
              routeParams,
              dashboardDateFilter,
            },
            buildLayoutContext: (nestedDefinition, nestedItem, extras) =>
              createEntityLayoutRenderContext({
                item: nestedItem,
                definition: nestedDefinition,
                locale,
                catalogItems,
                getDefinition,
                listFilters,
                routeParams,
                dashboardDateFilter,
                usePreviewPlaceholder,
                usePreviewSamples,
                t,
                getOneToManyRelationSubfieldValue:
                  extras?.getOneToManyRelationSubfieldValue,
                getManyToOneRelationSubfieldValue:
                  extras?.getManyToOneRelationSubfieldValue,
              }),
          })
        : undefined,
    lucideIconRenderer: (config, atBreakpoint) => (
      <LayoutLucideIcon config={config} atBreakpoint={atBreakpoint} />
    ),
    ...createComponentClickContextHelpers({
      item,
      entityName: definition.name,
      definition,
      resolveField,
      getDefinition,
    }),
  };
}
