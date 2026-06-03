import type { MetricKpiComponentConfig } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { resolveEntityCellValue } from "../../components/entity/resolve-entity-cell-value";
import { resolveEntityFieldPath } from "../../components/entity/resolve-entity-field-path";
import {
  readEntityFileDownloadUrl,
  resolveEntityLayoutImageDownloadTarget,
} from "../../components/entity/resolve-entity-layout-image-src";
import {
  resolveLayoutSlotDisplayMeta,
  resolveLayoutSlotLabel,
} from "../../components/entity/resolve-layout-slot-display";
import { EntityLayoutImageField } from "../../components/entity/EntityLayoutImageField";
import { MetricValueDisplay } from "../../components/metrics/MetricValueDisplay";
import { isEntityFileReferenceWithDownload } from "../../lib/entity-file-client";

export function createEntityLayoutRenderContext(options: {
  readonly item: Record<string, unknown>;
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
  /** When true, show the static card placeholder if no field image or default exists. */
  readonly usePreviewPlaceholder?: boolean;
  /** When true, empty field values show the field label as sample text. */
  readonly usePreviewSamples?: boolean;
}): LayoutRenderContext {
  const {
    item,
    definition,
    locale,
    getOneToManyCellValue = () => null,
    getDefinition,
    listFilters,
    routeParams,
    usePreviewPlaceholder = false,
    usePreviewSamples = false,
  } = options;

  const resolvePreviewSampleValue = usePreviewSamples
    ? (fieldPath: string) =>
        resolveLayoutSlotLabel(fieldPath, definition, getDefinition)
    : undefined;

  return {
    mode: "listItem",
    data: item,
    locale,
    resolveField: (path) =>
      resolveEntityFieldPath(item, path, definition, getOneToManyCellValue),
    resolveFieldMeta: (path) =>
      resolveLayoutSlotDisplayMeta(path, definition, getDefinition),
    resolveFieldLabel: (path) =>
      resolveLayoutSlotLabel(path, definition, getDefinition),
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
      return (
        resolveEntityLayoutImageDownloadTarget({
          item,
          fieldPath,
          definition,
        }) !== null
      );
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
        usePreviewPlaceholder={usePreviewPlaceholder}
      />
    ),
    metricKpiRenderer: (config: MetricKpiComponentConfig) => (
      <MetricValueDisplay
        metricDefinitionId={config.metricDefinitionId}
        groupBindings={config.groupBindings}
        dimensionBindings={config.dimensionBindings}
        label={config.label}
        context={{ record: item, listFilters, routeParams }}
      />
    ),
  };
}
