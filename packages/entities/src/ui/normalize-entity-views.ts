import type { ViewConfig } from "./types.js";

export function normalizeEntityViews(
  views: readonly ViewConfig[],
): readonly ViewConfig[] {
  const tableViews = views.filter((view) => view.type === "table");
  const expandableTableViews = views.filter(
    (view) => view.type === "expandableTable",
  );
  const cardViews = views.filter((view) => view.type === "card");
  const otherViews = views.filter(
    (view) =>
      view.type !== "table" &&
      view.type !== "expandableTable" &&
      view.type !== "card",
  );

  return [...tableViews, ...expandableTableViews, ...cardViews, ...otherViews];
}
