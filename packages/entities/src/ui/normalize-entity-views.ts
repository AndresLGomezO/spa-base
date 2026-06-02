import type { ViewConfig } from "./types.js";

export function normalizeEntityViews(
  views: readonly ViewConfig[],
): readonly ViewConfig[] {
  const tableViews = views.filter((view) => view.type === "table");
  const cardViews = views.filter((view) => view.type === "card");
  const otherViews = views.filter(
    (view) => view.type !== "table" && view.type !== "card",
  );

  return [...tableViews, ...cardViews, ...otherViews];
}
