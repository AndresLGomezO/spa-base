import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { EntityUIConfig } from "./types.js";

/** Canonical list item layout: top-level override, else legacy card view layout. */
export function normalizeListItemLayout(
  ui: Pick<EntityUIConfig, "listItem" | "views">,
): UiLayoutDocument | undefined {
  if (ui.listItem) {
    return ui.listItem;
  }
  const cardView = ui.views.find((view) => view.type === "card");
  return cardView?.layout;
}
