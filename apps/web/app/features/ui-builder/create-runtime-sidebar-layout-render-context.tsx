import { resolveStaticImageSrc } from "@repo/entities";
import type { SerializableEntityDefinition } from "@repo/entities";
import {
  CardFieldImage,
  Logo,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@repo/ui";
import {
  applyStyleRules,
  type NavTabComponentConfig,
  type NotificationBellComponentConfig,
  type AiChatComponentConfig,
  type SidebarCollapseComponentConfig,
  type SidebarNavComponentConfig,
  type SidebarTriggerComponentConfig,
  type UserComponentConfig,
} from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { TFunction } from "i18next";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@repo/theme/utils";

import { LayoutLucideIcon } from "../../components/entity/LayoutLucideIcon";
import { LayoutAiChatButton } from "../../components/entity/LayoutAiChatButton";
import { LayoutNotificationBell } from "../../components/entity/LayoutNotificationBell";
import {
  LayoutUserDisplay,
  type LayoutUserInfo,
} from "../../components/entity/LayoutUserDisplay";
import {
  NavGroupCollapsible,
  NavLinkItem,
} from "../../components/sidebar/NavCollapsibleItems";
import {
  findFirstSystemConfigNavIndex,
  isNavGroup,
  isPathActive,
  shouldShowSystemConfigurationNavSection,
  type NavItemConfig,
} from "../../components/sidebar/nav-config";
import { createComponentClickContextHelpers } from "./create-component-click-context-helpers.js";

/** Stub entity context so app-shell chrome can resolve `externalUrl` click actions. */
const APP_SHELL_CLICK_DEFINITION = {
  name: "__app-shell__",
  collection: "__app-shell__",
  permissions: [],
  fields: {},
  ui: { fields: {}, views: [], forms: {} },
} as unknown as SerializableEntityDefinition;

function RuntimeSidebarCollapse({
  config,
  label,
}: {
  readonly config: SidebarCollapseComponentConfig;
  readonly label: string;
}) {
  const { toggleSidebar, collapsed } = useSidebar();
  const iconName = collapsed
    ? (config.expandIconName ?? config.iconName ?? "PanelLeft")
    : (config.iconName ?? "PanelLeftClose");
  const size = config.iconSize ?? 16;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={toggleSidebar}
      className={cn(
        applyStyleRules(config.styles),
        "text-sidebar-foreground hover:bg-sidebar-highlight hidden size-8 shrink-0 items-center justify-center rounded-md transition-colors sm:flex",
      )}
    >
      <LayoutLucideIcon config={{ kind: "icon", iconName, iconSize: size }} />
    </button>
  );
}

function RuntimeSidebarTrigger({
  config,
  label,
  hamburgerHiddenClassName,
}: {
  readonly config: SidebarTriggerComponentConfig;
  readonly label: string;
  readonly hamburgerHiddenClassName?: string;
}) {
  const { setMobileOpen } = useSidebar();
  const iconName = config.iconName ?? "PanelLeft";
  const size = config.iconSize ?? 16;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setMobileOpen(true)}
      className={cn(
        applyStyleRules(config.styles),
        "text-foreground hover:bg-hover inline-flex size-9 items-center justify-center rounded-md border border-border transition-colors",
        hamburgerHiddenClassName,
      )}
    >
      <LayoutLucideIcon config={{ kind: "icon", iconName, iconSize: size }} />
    </button>
  );
}

function RuntimeNavTab({ config }: { readonly config: NavTabComponentConfig }) {
  const { pathname } = useLocation();
  const matchPath = config.matchPath ?? config.to;
  const active = isPathActive(pathname, matchPath);

  return (
    <Link
      to={config.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        applyStyleRules(config.styles),
        "inline-flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <LayoutLucideIcon
        config={{
          kind: "icon",
          iconName: config.iconName,
          iconSize: 16,
        }}
      />
      {config.label ? <span>{config.label}</span> : null}
    </Link>
  );
}

function RuntimeSystemConfigurationSectionHeader() {
  const { t } = useTranslation("common");

  return (
    <SidebarMenuItem
      role="presentation"
      aria-label={t("nav.systemConfiguration")}
      className={cn(
        "pointer-events-none mt-4 gap-3 pt-1 pb-2",
        "group-data-[collapsible=icon]/sidebar:mt-3 group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:py-1 group-data-[collapsible=icon]/sidebar:pb-0",
      )}
    >
      <SidebarSeparator className="mx-0" />
      <span className="text-muted-foreground px-2 pt-0.5 text-[11px] font-semibold uppercase tracking-wide group-data-[collapsible=icon]/sidebar:sr-only">
        {t("nav.systemConfiguration")}
      </span>
    </SidebarMenuItem>
  );
}

function RuntimeSidebarNav({
  config,
  navItems,
  onNavigate,
}: {
  readonly config: SidebarNavComponentConfig;
  readonly navItems: readonly NavItemConfig[];
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const systemConfigStartIndex = findFirstSystemConfigNavIndex(navItems);
  const showSystemConfigurationSection =
    shouldShowSystemConfigurationNavSection(navItems);
  const [openGroupPopoverId, setOpenGroupPopoverId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setOpenGroupPopoverId(null);
  }, [pathname]);

  const groupHeaderClassName = cn(applyStyleRules(config.groupItem.styles));
  const subgroupHeaderClassName = cn(
    applyStyleRules(config.subgroupItem.styles),
  );
  const rawItemClassName = cn(applyStyleRules(config.rawItem.styles));

  return (
    <nav
      className={cn(applyStyleRules(config.styles), "flex flex-col gap-1 py-1")}
      aria-label={t("nav.open")}
    >
      <SidebarMenu>
        {navItems.map((item, index) => (
          <Fragment key={item.id}>
            {showSystemConfigurationSection &&
            index === systemConfigStartIndex ? (
              <RuntimeSystemConfigurationSectionHeader />
            ) : null}
            {isNavGroup(item) ? (
              <NavGroupCollapsible
                group={item}
                pathname={pathname}
                onNavigate={onNavigate}
                popoverOpen={openGroupPopoverId === item.id}
                onPopoverOpenChange={(open) =>
                  setOpenGroupPopoverId(open ? item.id : null)
                }
                headerClassName={groupHeaderClassName}
                subgroupHeaderClassName={subgroupHeaderClassName}
              />
            ) : (
              <NavLinkItem
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                className={rawItemClassName}
              />
            )}
          </Fragment>
        ))}
      </SidebarMenu>
    </nav>
  );
}

const COLLAPSED_SIDEBAR_ICON_PX = 16;
const COLLAPSED_SIDEBAR_LOGO_PX = 32;

interface CreateRuntimeSidebarLayoutRenderContextOptions {
  readonly locale: string;
  readonly t: TFunction;
  readonly user?: LayoutUserInfo | null;
  readonly navItems: readonly NavItemConfig[];
  readonly onNavigate?: () => void;
  readonly tenantSwitcher?: ReactNode;
  readonly hasNotificationBell: boolean;
  readonly logoUrl?: string | null;
  readonly logoTitle?: string;
  readonly hamburgerHiddenClassName?: string;
  /** When true, render icons-only chrome sized for the collapsed sidebar rail. */
  readonly iconsOnly?: boolean;
  /**
   * When true (sidebar runtime/preview), match hardcoded AppSidebar chrome for
   * notification/user triggers and brand logo+title.
   */
  readonly sidebarChrome?: boolean;
  /** Current route pathname for `conditionKind: "activePath"` conditional styles. */
  readonly activePathname?: string;
}

export function createRuntimeSidebarLayoutRenderContext(
  options: CreateRuntimeSidebarLayoutRenderContextOptions,
): LayoutRenderContext {
  const {
    locale,
    t,
    user = null,
    navItems,
    onNavigate,
    tenantSwitcher = null,
    hasNotificationBell,
    logoUrl = null,
    logoTitle = "",
    hamburgerHiddenClassName,
    iconsOnly = false,
    sidebarChrome = true,
    activePathname,
  } = options;
  const fallbackName = t("nav.fallbackName");
  const clickHelpers = createComponentClickContextHelpers({
    item: {},
    entityName: APP_SHELL_CLICK_DEFINITION.name,
    definition: APP_SHELL_CLICK_DEFINITION,
    resolveField: () => undefined,
  });

  const context: LayoutRenderContext = {
    mode: "mainPage",
    data: {},
    locale,
    resolveField: () => undefined,
    ...clickHelpers,
    ...(activePathname !== undefined
      ? { resolveActivePathname: () => activePathname }
      : {}),
    isImagePresent: (_fieldPath, rawValue) => {
      if (typeof rawValue === "string" && rawValue.trim().length > 0) {
        return Boolean(resolveStaticImageSrc(rawValue));
      }
      return Boolean(logoUrl) || sidebarChrome;
    },
    resolveImage: (_fieldPath, rawValue, imageOptions) => {
      const configured =
        typeof rawValue === "string" ? resolveStaticImageSrc(rawValue) : null;
      const src = configured ?? logoUrl;
      const sizePx = iconsOnly
        ? COLLAPSED_SIDEBAR_LOGO_PX
        : (imageOptions.imageSize ?? 32);

      const media = src ? (
        <CardFieldImage
          src={src}
          alt={logoTitle}
          sizePx={sizePx}
          fillContainer={imageOptions.fillContainer}
          objectFit={imageOptions.objectFit ?? "contain"}
          className={cn(
            imageOptions.className,
            "size-8 shrink-0 rounded object-contain",
          )}
          style={imageOptions.style}
        />
      ) : sidebarChrome ? (
        <Logo
          size="sm"
          className={cn(
            "shrink-0",
            imageOptions.className,
            "group-data-[collapsible=icon]/sidebar:!size-8",
          )}
        />
      ) : null;

      if (!media) {
        return null;
      }

      if (!sidebarChrome) {
        return media;
      }

      return (
        <Link
          to="/"
          prefetch="intent"
          onClick={onNavigate}
          className={cn(
            "hover:bg-sidebar-highlight hover:text-sidebar-foreground flex w-full min-w-0 items-center gap-2 rounded-md p-2 transition-colors",
            "group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:px-1.5",
          )}
        >
          {media}
          <span className="truncate font-semibold group-data-[collapsible=icon]/sidebar:sr-only">
            {logoTitle}
          </span>
        </Link>
      );
    },
    lucideIconRenderer: (config, atBreakpoint) => (
      <LayoutLucideIcon
        config={
          iconsOnly
            ? {
                ...config,
                iconSize: Math.min(
                  config.iconSize ?? COLLAPSED_SIDEBAR_ICON_PX,
                  COLLAPSED_SIDEBAR_ICON_PX,
                ),
                label: undefined,
              }
            : config
        }
        atBreakpoint={atBreakpoint}
      />
    ),
    userRenderer: (config: UserComponentConfig) => (
      <>
        {!hasNotificationBell ? tenantSwitcher : null}
        <LayoutUserDisplay
          config={config}
          user={user}
          fallbackName={fallbackName}
          iconsOnly={iconsOnly}
          sidebarChrome={sidebarChrome}
        />
      </>
    ),
    notificationBellRenderer: (config: NotificationBellComponentConfig) => (
      <>
        {tenantSwitcher}
        <LayoutNotificationBell
          config={config}
          iconsOnly={iconsOnly}
          sidebarChrome={sidebarChrome}
        />
      </>
    ),
    aiChatRenderer: (config: AiChatComponentConfig) => (
      <LayoutAiChatButton config={config} />
    ),
    sidebarCollapseRenderer: (config: SidebarCollapseComponentConfig) => (
      <RuntimeSidebarCollapse config={config} label={t("nav.collapse")} />
    ),
    sidebarNavRenderer: (config: SidebarNavComponentConfig) => (
      <RuntimeSidebarNav
        config={config}
        navItems={navItems}
        onNavigate={onNavigate}
      />
    ),
    sidebarTriggerRenderer: (config: SidebarTriggerComponentConfig) => (
      <RuntimeSidebarTrigger
        config={config}
        label={t("nav.open")}
        hamburgerHiddenClassName={hamburgerHiddenClassName}
      />
    ),
    navTabRenderer: (config: NavTabComponentConfig) => (
      <RuntimeNavTab config={config} />
    ),
  };

  return context;
}

/** Runtime render context for header / footer chrome (trigger + nav tabs). */
export function createRuntimeAppShellChromeRenderContext(
  options: Omit<
    CreateRuntimeSidebarLayoutRenderContextOptions,
    "navItems" | "hasNotificationBell" | "tenantSwitcher"
  >,
): LayoutRenderContext {
  return createRuntimeSidebarLayoutRenderContext({
    ...options,
    navItems: [],
    hasNotificationBell: false,
    tenantSwitcher: null,
    sidebarChrome: false,
  });
}
