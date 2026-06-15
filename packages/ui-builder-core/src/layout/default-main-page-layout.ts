import {
  addComponentRowAt,
  createDefaultComponent,
} from "../builder/mutations.js";
import type { UiLayoutDocument } from "../types/layout.js";
import { beginContainerRootLayout } from "./ensure-container-root.js";

/** Default main entity page: toolbar → metrics → list inside the root container. */
export function createDefaultMainPageLayout(): UiLayoutDocument {
  const { layout: beganLayout, containerLocator } = beginContainerRootLayout();
  let layout = beganLayout;

  for (const kind of ["page-toolbar", "page-metrics", "page-list"] as const) {
    layout = addComponentRowAt(
      layout,
      containerLocator,
      createDefaultComponent(kind, ""),
    );
  }

  return layout;
}
