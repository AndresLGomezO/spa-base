import type { DashboardSectionDefinition } from "@repo/entities";
import { CardFieldImage } from "@repo/ui";
import type {
  UserComponentConfig,
  NotificationBellComponentConfig,
} from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { TFunction } from "i18next";

import { LayoutNotificationBell } from "../../components/entity/LayoutNotificationBell";
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
import { DashboardMetricDerivedKpiSlot } from "./DashboardMetricDerivedKpiSlot";
import { DashboardMetricKpiSlot } from "./DashboardMetricKpiSlot";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context";
import { createMetricWidgetRenderer } from "./create-metric-widget-renderer";
import { ChartComponentSlot } from "./ChartComponentSlot";
import { listFiltersForEntity } from "./list-filters-for-entity";
import { GlobalSearchDashboardTrigger } from "../global-search/GlobalSearchDashboardTrigger";
import { ViewFiltersComponent } from "./ViewFiltersComponent";
import { ViewDateFilterComponent } from "./ViewDateFilterComponent";
import { resolveStaticImageSrc } from "@repo/entities";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";

interface CreateTenantDashboardLayoutRenderContextOptions {
  readonly sections: readonly DashboardSectionDefinition[];
  readonly catalogItems: readonly EntityCatalogEntry[];
  readonly locale: string;
  readonly t: TFunction;
  readonly user?: LayoutUserInfo | null;
  readonly pageFilters?: Readonly<Record<string, readonly string[]>>;
  readonly dashboardDateFilter?: DashboardDateFilterContextValue;
  readonly getDefinition?: (
    entityName: EntityName,
  ) => EntityCatalogEntry | undefined;
  readonly previewMode?: boolean;
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
    dashboardDateFilter,
    getDefinition,
    previewMode = false,
  } = options;
  const fallbackName = t("nav.fallbackName");
  const dateRouteParams = dashboardDateFilter
    ? { [dashboardDateFilter.param]: dashboardDateFilter.value }
    : {};

  const buildLayoutContext = (): LayoutRenderContext => ({
    mode: "listItem",
    data: {},
    locale,
    dashboardDateFilter,
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
          fillContainer={imageOptions.fillContainer}
          objectFit={imageOptions.objectFit}
          className={imageOptions.className}
          style={imageOptions.style}
        />
      );
    },
    lucideIconRenderer: (config, atBreakpoint) => (
      <LayoutLucideIcon config={config} atBreakpoint={atBreakpoint} />
    ),
    userRenderer: (config: UserComponentConfig) => (
      <LayoutUserDisplay
        config={config}
        user={user}
        fallbackName={fallbackName}
      />
    ),
    notificationBellRenderer: (config: NotificationBellComponentConfig) => (
      <LayoutNotificationBell config={config} />
    ),
    metricKpiRenderer: (config, presentation) => (
      <DashboardMetricKpiSlot
        config={config}
        presentation={presentation}
        pageFilters={pageFilters}
        dashboardDateFilter={dashboardDateFilter}
      />
    ),
    metricDerivedKpiRenderer: (config, presentation) => (
      <DashboardMetricDerivedKpiSlot
        config={config}
        presentation={presentation}
        pageFilters={pageFilters}
        dashboardDateFilter={dashboardDateFilter}
      />
    ),
    chartRenderer: (config) => (
      <ChartComponentSlot
        config={config}
        context={{
          record: {},
          listFilters: pageFilters,
          routeParams: dateRouteParams,
          dashboardDateFilter,
        }}
        catalog={catalogItems}
      />
    ),
    metricWidgetRenderer: getDefinition
      ? createMetricWidgetRenderer({
          dashboardDateFilter,
          buildLayoutContext: (definition, item, extras) =>
            createEntityLayoutRenderContext({
              item,
              definition,
              locale,
              catalogItems,
              getDefinition,
              listFilters: listFiltersForEntity(definition.name, pageFilters),
              routeParams: dateRouteParams,
              dashboardDateFilter,
              usePreviewPlaceholder: previewMode,
              usePreviewSamples: previewMode,
              t,
              getOneToManyRelationSubfieldValue:
                extras?.getOneToManyRelationSubfieldValue,
              getManyToOneRelationSubfieldValue:
                extras?.getManyToOneRelationSubfieldValue,
            }),
        })
      : undefined,
    viewSearchRenderer: (config) => (
      <GlobalSearchDashboardTrigger config={config} previewMode={previewMode} />
    ),
    viewFiltersRenderer: (config) => <ViewFiltersComponent config={config} />,
    viewDateFilterRenderer: (config) => (
      <ViewDateFilterComponent config={config} />
    ),
    dashboardSectionRenderer: createDashboardSectionRenderer({
      sections,
      t,
      buildLayoutContext,
    }),
  });

  return buildLayoutContext();
}
