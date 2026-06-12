import { migrateListPresentation } from "./migrate-list-presentation.js";
import { normalizeEntityViews } from "./normalize-entity-views.js";
import type { EntityUiOverrideForms } from "./form-config.js";
import { isCardViewConfig } from "./types.js";
import type {
  EntityUiOverrideRecord,
  FormConfig,
  SerializableEntityDefinition,
  ViewConfig,
} from "./types.js";

function mergeFormConfig(
  base: FormConfig,
  overrideForms: EntityUiOverrideForms | undefined,
): FormConfig {
  if (!overrideForms) {
    return base;
  }

  const sharedLayout = overrideForms.layout;
  const presentation =
    overrideForms.presentation ??
    (overrideForms.wizard ? ("wizard" as const) : undefined) ??
    base.presentation;
  const wizard = overrideForms.wizard ?? base.wizard;

  const layoutForPlain = presentation === "wizard" ? undefined : sharedLayout;

  return {
    presentation: presentation ?? (wizard ? "wizard" : "plain"),
    ...(wizard ? { wizard } : {}),
    ...(overrideForms.modalSize !== undefined || base.modalSize !== undefined
      ? { modalSize: overrideForms.modalSize ?? base.modalSize }
      : {}),
    ...(overrideForms.modalSizeByBreakpoint !== undefined ||
    base.modalSizeByBreakpoint !== undefined
      ? {
          modalSizeByBreakpoint:
            overrideForms.modalSizeByBreakpoint ?? base.modalSizeByBreakpoint,
        }
      : {}),
    ...(overrideForms.modalChrome !== undefined ||
    base.modalChrome !== undefined
      ? { modalChrome: overrideForms.modalChrome ?? base.modalChrome }
      : {}),
    ...(overrideForms.modalFooterLayout !== undefined ||
    base.modalFooterLayout !== undefined
      ? {
          modalFooterLayout:
            overrideForms.modalFooterLayout ?? base.modalFooterLayout,
        }
      : {}),
    create: layoutForPlain
      ? { ...base.create, layout: layoutForPlain }
      : base.create,
    edit: layoutForPlain ? { ...base.edit, layout: layoutForPlain } : base.edit,
  };
}

export function mergeEntityUiOverrides(
  definition: SerializableEntityDefinition,
  override: EntityUiOverrideRecord | null | undefined,
): SerializableEntityDefinition {
  if (!override || override.views.length === 0) {
    return definition;
  }

  const baseTableView = definition.ui.views.find(
    (view) => view.type === "table",
  );
  const baseExpandableView = definition.ui.views.find(
    (view) => view.type === "expandableTable",
  );
  const overrideTableView = override.views.find(
    (view) => view.type === "table",
  );
  const overrideExpandableView = override.views.find(
    (view) => view.type === "expandableTable",
  );
  const overrideCardView = override.views.find((view) => view.type === "card");
  const otherOverrideViews = override.views.filter(
    (view) =>
      view.type !== "table" &&
      view.type !== "expandableTable" &&
      view.type !== "card",
  );

  const mergedViews: ViewConfig[] = [];

  const tableView = overrideTableView ?? baseTableView;
  if (tableView) {
    mergedViews.push(tableView as ViewConfig);
  }

  const expandableView = overrideExpandableView ?? baseExpandableView;
  if (expandableView) {
    mergedViews.push(expandableView as ViewConfig);
  }

  if (overrideCardView) {
    mergedViews.push(overrideCardView as ViewConfig);
  }

  mergedViews.push(...(otherOverrideViews as ViewConfig[]));

  const listItem =
    override.listItem ??
    (overrideCardView && isCardViewConfig(overrideCardView)
      ? overrideCardView.layout
      : undefined);

  const recordDetailLayout =
    override.recordDetail ?? override.detail ?? undefined;

  const mergedUi = migrateListPresentation({
    ...definition.ui,
    views: normalizeEntityViews(mergedViews),
    ...(override.listViewType !== undefined
      ? { listViewType: override.listViewType }
      : {}),
    ...(listItem ? { listItem } : {}),
    ...(override.mainPage ? { mainPageLayout: override.mainPage } : {}),
    ...(recordDetailLayout
      ? {
          recordDetailLayout,
          detailLayout: recordDetailLayout,
        }
      : {}),
    forms: mergeFormConfig(definition.ui.forms, override.forms),
  });

  return {
    ...definition,
    ui: mergedUi,
  };
}

/** @deprecated Use mergeEntityUiOverrides */
export const mergeEntityViewOverrides = mergeEntityUiOverrides;
