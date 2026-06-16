import type { DashboardSectionDefinition } from "@repo/entities";
import { CardFieldImage } from "@repo/ui";
import type { UserComponentConfig } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { TFunction } from "i18next";

import {
  LayoutUserDisplay,
  type LayoutUserInfo,
} from "../../components/entity/LayoutUserDisplay";
import { LayoutLucideIcon } from "../../components/entity/LayoutLucideIcon";
import type {
  EntityCatalogEntry,
  EntityName,
} from "../../entities/entity-catalog";
import { createDashboardSectionRenderer } from "./create-dashboard-section-renderer";
import { DashboardMetricKpiSlot } from "./DashboardMetricKpiSlot";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context";
import { createMetricWidgetRenderer } from "./create-metric-widget-renderer";
import { listFiltersForEntity } from "./list-filters-for-entity";
import { ViewFilterComponent } from "./ViewFilterComponent";
import { resolveStaticImageSrc } from "@repo/entities";

interface CreateTenantDashboardLayoutRenderContextOptions {
  readonly sections: readonly DashboardSectionDefinition[];
  readonly catalogItems: readonly EntityCatalogEntry[];
  readonly locale: string;
  readonly t: TFunction;
  readonly user?: LayoutUserInfo | null;
  readonly pageFilters?: Readonly<Record<string, readonly string[]>>;
  readonly getDefinition?: (
    entityName: EntityName,
  ) => EntityCatalogEntry | undefined;
}

export function createTenantDashboardLayoutRenderContext(
  options: CreateTenantDashboardLayoutRenderContextOptions,
): LayoutRenderContext {
  const {
    sections,
    catalogItems,
    locale,
    t,
    user = null,
    pageFilters = {},
    getDefinition,
  } = options;
  const fallbackName = t("nav.fallbackName");

  const buildLayoutContext = (): LayoutRenderContext => ({
    mode: "listItem",
    data: {},
    locale,
    resolveField: () => undefined,
    isImagePresent: (_fieldPath, rawValue) => {
      if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
        return false;
      }
      return Boolean(resolveStaticImageSrc(rawValue));
    },
    resolveImage: (_fieldPath, rawValue, imageOptions) => {
      const src =
        typeof rawValue === "string" ? resolveStaticImageSrc(rawValue) : null;
      if (!src) {
        return null;
      }

      return (
        <CardFieldImage
          src={src}
          alt=""
          sizePx={imageOptions.imageSize}
          className={imageOptions.className}
          style={imageOptions.style}
        />
      );
    },
    lucideIconRenderer: (config) => <LayoutLucideIcon config={config} />,
    userRenderer: (config: UserComponentConfig) => (
      <LayoutUserDisplay
        config={config}
        user={user}
        fallbackName={fallbackName}
      />
    ),
    metricKpiRenderer: (config, presentation) => (
      <DashboardMetricKpiSlot
        config={config}
        presentation={presentation}
        pageFilters={pageFilters}
      />
    ),
    metricWidgetRenderer: getDefinition
      ? createMetricWidgetRenderer({
          catalogItems,
          t,
          buildLayoutContext: (definition, item) =>
            createEntityLayoutRenderContext({
              item,
              definition,
              locale,
              catalogItems,
              getDefinition,
              listFilters: listFiltersForEntity(definition.name, pageFilters),
              routeParams: {},
              usePreviewPlaceholder: true,
              usePreviewSamples: true,
              t,
            }),
        })
      : undefined,
    viewFilterRenderer: (config) => <ViewFilterComponent config={config} />,
    dashboardSectionRenderer: createDashboardSectionRenderer({
      sections,
      t,
      buildLayoutContext,
    }),
  });

  return buildLayoutContext();
}
