import {
  createDefaultSidebarCollapseComponent,
  createDefaultSidebarNavComponent,
  createScreenRootNode,
  ensureAppShellScreenRoot,
  type ComponentRowNode,
  type SidebarNavItemTemplate,
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

function createNavItemTemplate(
  iconName: string,
  templateIdPrefix: string,
): SidebarNavItemTemplate {
  return {
    rows: [
      componentRow(`${templateIdPrefix}-icon`, {
        kind: "icon",
        iconName,
        iconSize: 16,
      }),
      componentRow(`${templateIdPrefix}-label`, {
        kind: "text",
        primary: { type: "static", value: "Item" },
      }),
    ],
  };
}

/**
 * Stable section ids used by runtime to slot into SidebarHeader / Content / Footer
 * so a pristine tenant save matches the hardcoded platform chrome.
 */
export const SIDEBAR_LAYOUT_HEADER_ID = "sidebar-header";
export const SIDEBAR_LAYOUT_NAV_ID = "sidebar-nav";
export const SIDEBAR_LAYOUT_FOOTER_ID = "sidebar-footer";

/**
 * Designer hydrate document mirroring today's AppSidebar chrome.
 * Runtime does NOT use this when no tenant override exists — it keeps the hardcoded sidebar.
 * First tenant save should look like the platform default so customization starts from parity.
 *
 * Main sections are plain containers (not grids) so the structure tree stays neutral.
 */
export function createDefaultSidebarLayout(): UiLayoutDocument {
  const logoRow = componentRow(
    "sidebar-logo",
    {
      kind: "image",
      primary: { type: "static", value: "" },
      imageSize: 32,
    },
    "Logo",
  );

  const collapseRow = componentRow(
    "sidebar-collapse",
    {
      ...createDefaultSidebarCollapseComponent(),
      styles: [{ property: "marginLeft", value: "auto" }],
    },
    "Collapse",
  );

  const headerStack = componentRow(
    SIDEBAR_LAYOUT_HEADER_ID,
    {
      kind: "container",
      stackDirection: "column",
      rows: [logoRow, collapseRow],
    },
    "Header",
  );

  const navConfig = createDefaultSidebarNavComponent();
  const navRow = componentRow(
    SIDEBAR_LAYOUT_NAV_ID,
    {
      ...navConfig,
      groupItem: createNavItemTemplate("Folder", "sidebar-group"),
      subgroupItem: createNavItemTemplate("FolderOpen", "sidebar-subgroup"),
      rawItem: createNavItemTemplate("File", "sidebar-raw"),
    },
    "Navigation",
  );

  const notificationRow = componentRow(
    "sidebar-notification-bell",
    {
      kind: "notification-bell",
      iconName: "Bell",
      showBadge: true,
    },
    "Notifications",
  );

  const userRow = componentRow(
    "sidebar-user",
    {
      kind: "user",
      display: "profile-button",
      profileButtonContent: "full",
      avatarShape: "circle",
    },
    "Profile",
  );

  const footerStack = componentRow(
    SIDEBAR_LAYOUT_FOOTER_ID,
    {
      kind: "container",
      stackDirection: "column",
      rows: [notificationRow, userRow],
    },
    "Footer",
  );

  const shell = componentRow(
    "sidebar-shell",
    {
      kind: "container",
      stackDirection: "column",
      rows: [headerStack, navRow, footerStack],
    },
    "Sidebar",
  );

  return ensureAppShellScreenRoot({
    root: createScreenRootNode([shell], {
      gridTemplateColumns: "1fr",
    }),
    showActions: false,
  });
}

export function createDefaultSidebarLayoutSettings(): {
  readonly autoCollapseBreakpoint: null;
  readonly hamburgerBreakpoint: "md";
} {
  return {
    autoCollapseBreakpoint: null,
    hamburgerBreakpoint: "md",
  };
}
