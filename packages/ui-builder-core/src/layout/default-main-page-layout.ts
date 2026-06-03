import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
} from "../builder/mutations.js";
import type { UiLayoutDocument } from "../types/layout.js";

/** Default main entity page: toolbar → metrics → list. */
export function createDefaultMainPageLayout(): UiLayoutDocument {
  let layout = createEmptyLayout(1);
  const locator = { scope: "root" as const, columnIndex: 0 };

  for (const kind of ["page-toolbar", "page-metrics", "page-list"] as const) {
    layout = addComponentRowAt(
      layout,
      locator,
      createDefaultComponent(kind, ""),
    );
  }

  return layout;
}
