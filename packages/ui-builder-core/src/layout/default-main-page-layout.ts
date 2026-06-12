import {
  addComponentRowAt,
  createDefaultComponent,
  createEmptyLayout,
  insertNestedLayoutRowAt,
} from "../builder/mutations.js";
import type { UiLayoutDocument } from "../types/layout.js";

/** Default main entity page: toolbar → metrics → list inside a root nested layout. */
export function createDefaultMainPageLayout(): UiLayoutDocument {
  let layout = createEmptyLayout(1);
  const rootColumnIndex = 0;
  const { layout: withNested, rowId: nestedRowId } = insertNestedLayoutRowAt(
    layout,
    { scope: "root", columnIndex: rootColumnIndex },
    { position: "after" },
    1,
  );
  layout = withNested;

  const nestedLocator = {
    scope: "nested" as const,
    columnIndex: rootColumnIndex,
    rowId: nestedRowId,
    nestedColumnIndex: 0,
  };

  for (const kind of ["page-toolbar", "page-metrics", "page-list"] as const) {
    layout = addComponentRowAt(
      layout,
      nestedLocator,
      createDefaultComponent(kind, ""),
    );
  }

  return layout;
}
