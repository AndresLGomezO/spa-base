import {
  createDefaultSidebarTriggerComponent,
  createScreenRootNode,
  ensureAppShellScreenRoot,
  type ComponentRowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

function componentRow(
  id: string,
  component: ComponentRowNode["component"],
  name?: string,
): ComponentRowNode {
  return {
    type: "component",
    id,
    component,
    ...(name ? { name } : {}),
  };
}

/**
 * Default global mobile header: hamburger trigger (mirrors today's AppHeader).
 * Plain container so the structure tree stays neutral (no grid/track wrappers).
 */
export function createDefaultHeaderLayout(): UiLayoutDocument {
  const triggerRow = componentRow(
    "header-sidebar-trigger",
    createDefaultSidebarTriggerComponent(),
    "Menu",
  );

  const bar = componentRow(
    "app-header-bar",
    {
      kind: "container",
      stackDirection: "row",
      rows: [triggerRow],
    },
    "Header",
  );

  return ensureAppShellScreenRoot({
    root: createScreenRootNode([bar], { gridTemplateColumns: "1fr" }),
    showActions: false,
  });
}

/**
 * Default empty footer — no bottom nav until author adds nav-tab items.
 * Empty container under screen-root (stays a plain container).
 */
export function createDefaultFooterLayout(): UiLayoutDocument {
  const shell = componentRow(
    "app-footer-shell",
    {
      kind: "container",
      stackDirection: "row",
      rows: [],
    },
    "Footer",
  );

  return ensureAppShellScreenRoot({
    root: createScreenRootNode([shell], { gridTemplateColumns: "1fr" }),
    showActions: false,
  });
}
