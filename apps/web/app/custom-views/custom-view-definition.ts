import type { CustomViewRecord } from "@repo/custom-views";
import type { ViewConfig, EntityUIConfig, FieldUIConfig } from "@repo/entities";
import type { EntityCatalogEntry } from "../entities/entity-catalog";

export function buildCustomViewPageDefinition(
  sourceDefinition: EntityCatalogEntry,
  customView: CustomViewRecord,
): EntityCatalogEntry {
  return {
    ...sourceDefinition,
    ui: {
      ...sourceDefinition.ui,
      views: customView.ui.views as readonly ViewConfig[],
      ...(customView.ui.listViewType
        ? { listViewType: customView.ui.listViewType }
        : {}),
      ...(customView.ui.listItem
        ? { listItem: customView.ui.listItem as EntityUIConfig["listItem"] }
        : {}),
      ...(customView.ui.mainPageLayout
        ? {
            mainPageLayout: customView.ui
              .mainPageLayout as EntityUIConfig["mainPageLayout"],
          }
        : {}),
      ...(customView.ui.metricRowLayout
        ? {
            metricRowLayout: customView.ui
              .metricRowLayout as EntityUIConfig["metricRowLayout"],
          }
        : {}),
      ...(customView.ui.metricWidgets
        ? {
            metricWidgets: customView.ui
              .metricWidgets as EntityUIConfig["metricWidgets"],
          }
        : {}),
      ...(customView.ui.fields
        ? {
            fields: {
              ...sourceDefinition.ui.fields,
              ...(customView.ui.fields as Readonly<
                Record<string, FieldUIConfig>
              >),
            },
          }
        : {}),
    } as EntityUIConfig,
  };
}

export function getCustomViewLabel(customView: CustomViewRecord): string {
  return customView.nav.label.trim().length > 0
    ? customView.nav.label
    : customView.name;
}

export function getLocalizedCustomViewLabel(
  customView: CustomViewRecord,
  resolve: (key: string, fallback: string) => string,
): string {
  const fallback = getCustomViewLabel(customView);
  const fromNav = resolve(
    `customView.${customView.viewId}.nav.label`,
    fallback,
  );
  if (fromNav !== fallback) return fromNav;
  return resolve(`customView.${customView.viewId}.name`, fallback);
}
