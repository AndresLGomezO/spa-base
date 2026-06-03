import { normalizeEntityViews } from "./normalize-entity-views.js";
import type {
  EntityUIConfig,
  EntityUiOverrideRecord,
  FormConfig,
  SerializableEntityDefinition,
  ViewConfig,
} from "./types.js";

function mergeFormConfig(
  base: FormConfig,
  overrideForms: EntityUiOverrideRecord["forms"],
): FormConfig {
  if (!overrideForms) {
    return base;
  }
  return {
    create: overrideForms.create
      ? { ...base.create, layout: overrideForms.create }
      : base.create,
    edit: overrideForms.edit
      ? { ...base.edit, layout: overrideForms.edit }
      : base.edit,
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
  const overrideTableView = override.views.find(
    (view) => view.type === "table",
  );
  const overrideCardView = override.views.find((view) => view.type === "card");
  const otherOverrideViews = override.views.filter(
    (view) => view.type !== "table" && view.type !== "card",
  );

  const mergedViews: ViewConfig[] = [];

  const tableView = overrideTableView ?? baseTableView;
  if (tableView) {
    mergedViews.push(tableView as ViewConfig);
  }

  if (overrideCardView) {
    mergedViews.push(overrideCardView as ViewConfig);
  }

  mergedViews.push(...(otherOverrideViews as ViewConfig[]));

  const listItem =
    override.listItem ?? (overrideCardView as ViewConfig | undefined)?.layout;

  const mergedUi: EntityUIConfig = {
    ...definition.ui,
    views: normalizeEntityViews(mergedViews),
    ...(override.listViewType !== undefined
      ? { listViewType: override.listViewType }
      : {}),
    ...(listItem ? { listItem } : {}),
    ...(override.detail ? { detailLayout: override.detail } : {}),
    forms: mergeFormConfig(definition.ui.forms, override.forms),
  };

  return {
    ...definition,
    ui: mergedUi,
  };
}

/** @deprecated Use mergeEntityUiOverrides */
export const mergeEntityViewOverrides = mergeEntityUiOverrides;
