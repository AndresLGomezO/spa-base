import { normalizeEntityViews } from "./normalize-entity-views.js";
import type {
  EntityUIConfig,
  EntityUiOverrideRecord,
  SerializableEntityDefinition,
  ViewConfig,
} from "./types.js";

export function mergeEntityViewOverrides(
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
    mergedViews.push(tableView);
  }

  if (overrideCardView) {
    mergedViews.push(overrideCardView);
  }

  mergedViews.push(...otherOverrideViews);

  return {
    ...definition,
    ui: {
      ...definition.ui,
      views: normalizeEntityViews(mergedViews),
      ...(override.listViewType !== undefined
        ? { listViewType: override.listViewType }
        : {}),
    },
  };
}

export function getEntityUiOverrideViews(
  ui: EntityUIConfig,
): EntityUIConfig["views"] {
  return ui.views;
}
