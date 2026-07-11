import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  layoutHasComponentKind,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMobile,
  SidebarSeparator,
  useSidebar,
} from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { NavigationProgressBar } from "./NavMain";
import { TenantSwitcher } from "../TenantSwitcher";
import { useNavItems } from "../../routing/nav-items-context";
import {
  createRuntimeAppShellChromeRenderContext,
  createRuntimeSidebarLayoutRenderContext,
} from "../../features/ui-builder/create-runtime-sidebar-layout-render-context";
import type { LayoutUserInfo } from "../entity/LayoutUserDisplay";
import { resolveAppShellChromeDisplayClassName } from "./app-shell-chrome-display";
import { appShellLayoutHasContent } from "./app-shell-layout-has-content";
import {
  layoutDocumentFromRow,
  resolveSidebarLayoutChromeSections,
} from "./sidebar-layout-chrome-sections";
import { cn } from "@repo/theme/utils";
import { usePreviewBreakpoint } from "@repo/ui-builder-renderer";

interface DesignedAppSidebarProps {
  readonly layout: UiLayoutDocument;
}

export function DesignedSidebarBody({
  layout,
  onNavigate,
  iconsOnly = false,
}: {
  readonly layout: UiLayoutDocument;
  readonly onNavigate?: () => void;
  readonly iconsOnly?: boolean;
}) {
  const { t, i18n } = useTranslation("common");
  const {
    user,
    isSuperAdmin,
    availableTenants,
    tenantAppearance,
    activeTenantName,
  } = useAuth();
  const { navItems } = useNavItems();

  const layoutUser = useMemo<LayoutUserInfo | null>(() => {
    if (!user) {
      return null;
    }
    return {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
    };
  }, [user]);

  const hasNotificationBell = layoutHasComponentKind(
    layout,
    "notification-bell",
  );

  const context = useMemo(() => {
    const tenantSwitcher: ReactNode =
      isSuperAdmin && availableTenants.length > 0 ? (
        <div
          className={iconsOnly ? "flex justify-center px-1 py-1" : "px-2 py-1"}
        >
          <TenantSwitcher />
        </div>
      ) : null;

    return createRuntimeSidebarLayoutRenderContext({
      locale: i18n.language,
      t,
      user: layoutUser,
      navItems,
      onNavigate,
      tenantSwitcher,
      hasNotificationBell,
      logoUrl: tenantAppearance?.logoUrl ?? null,
      logoTitle: activeTenantName ?? "",
      iconsOnly,
      sidebarChrome: true,
    });
  }, [
    activeTenantName,
    availableTenants.length,
    hasNotificationBell,
    i18n.language,
    iconsOnly,
    isSuperAdmin,
    layoutUser,
    navItems,
    onNavigate,
    t,
    tenantAppearance?.logoUrl,
  ]);

  const chromeSections = useMemo(
    () => resolveSidebarLayoutChromeSections(layout),
    [layout],
  );

  if (chromeSections) {
    return (
      <>
        <SidebarHeader>
          <RecursiveLayoutRenderer
            layout={layoutDocumentFromRow(chromeSections.header)}
            context={context}
          />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <RecursiveLayoutRenderer
            layout={layoutDocumentFromRow(chromeSections.nav)}
            context={context}
          />
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <RecursiveLayoutRenderer
            layout={layoutDocumentFromRow(chromeSections.footer)}
            context={context}
          />
        </SidebarFooter>
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <RecursiveLayoutRenderer
        layout={layout}
        context={context}
        className="flex h-full min-h-0 flex-col"
      />
    </div>
  );
}

export function DesignedAppSidebar({ layout }: DesignedAppSidebarProps) {
  const { t } = useTranslation("common");
  const { setMobileOpen, collapsed, isMobile } = useSidebar();
  const iconsOnly = collapsed && !isMobile;

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <Sidebar>
        <DesignedSidebarBody layout={layout} iconsOnly={iconsOnly} />
      </Sidebar>
      <SidebarMobile title={t("nav.open")}>
        <div
          className="group/sidebar flex h-full flex-col"
          data-collapsible="expanded"
        >
          <DesignedSidebarBody layout={layout} onNavigate={closeMobile} />
        </div>
      </SidebarMobile>
    </>
  );
}

interface DesignedAppHeaderProps {
  readonly layout: UiLayoutDocument;
}

export function DesignedAppHeader({ layout }: DesignedAppHeaderProps) {
  const { t, i18n } = useTranslation("common");
  const { user, tenantAppearance, activeTenantName } = useAuth();
  const { hamburgerHiddenClassName } = useSidebar();
  const atBreakpoint = usePreviewBreakpoint();

  const layoutUser = useMemo<LayoutUserInfo | null>(() => {
    if (!user) {
      return null;
    }
    return {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
    };
  }, [user]);

  const context = useMemo(
    () =>
      createRuntimeAppShellChromeRenderContext({
        locale: i18n.language,
        t,
        user: layoutUser,
        logoUrl: tenantAppearance?.logoUrl ?? null,
        logoTitle: activeTenantName ?? "",
        hamburgerHiddenClassName,
      }),
    [
      activeTenantName,
      hamburgerHiddenClassName,
      i18n.language,
      layoutUser,
      t,
      tenantAppearance?.logoUrl,
    ],
  );

  if (!appShellLayoutHasContent(layout)) {
    return (
      <div className="relative">
        <NavigationProgressBar />
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <NavigationProgressBar />
      </div>
      <header
        className={cn(
          "border-border relative z-20 h-14 shrink-0 items-center border-b px-4",
          resolveAppShellChromeDisplayClassName(layout, atBreakpoint),
        )}
      >
        <RecursiveLayoutRenderer layout={layout} context={context} />
      </header>
    </>
  );
}
