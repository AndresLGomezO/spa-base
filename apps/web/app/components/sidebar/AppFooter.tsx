import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import {
  containerRowWrapperClassName,
  isContainerComponent,
  resolveRowWrapperStyleRules,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  RecursiveLayoutRenderer,
  ResponsiveStyleTag,
  usePreviewBreakpoint,
} from "@repo/ui-builder-renderer";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";
import type { LayoutUserInfo } from "../entity/LayoutUserDisplay";
import { createRuntimeAppShellChromeRenderContext } from "../../features/ui-builder/create-runtime-sidebar-layout-render-context";
import { resolveAppShellChromeDisplayClassName } from "./app-shell-chrome-display";
import { appShellLayoutHasContent } from "./app-shell-layout-has-content";
import { resolveAppShellRootContainerRow } from "./app-shell-root-container";

interface AppFooterProps {
  readonly layout: UiLayoutDocument;
}

/** Structural host only — layout styles own background, border, and padding. */
const FOOTER_HOST_STRUCTURAL_CLASS_NAME =
  "sticky bottom-0 z-20 flex w-full min-w-0 shrink-0";

/** Fallback chrome when there is no promoted root container to style the host. */
const FOOTER_HOST_DEFAULT_CHROME_CLASS_NAME =
  "border-border bg-background sticky bottom-0 z-20 flex shrink-0 items-center border-t px-2 py-1";

export function AppFooter({ layout }: AppFooterProps) {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuth();
  const { pathname } = useLocation();
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
        activePathname: pathname,
      }),
    [i18n.language, layoutUser, pathname, t],
  );

  if (!appShellLayoutHasContent(layout)) {
    return null;
  }

  const chromeDisplayClassName = resolveAppShellChromeDisplayClassName(
    layout,
    atBreakpoint,
  );

  const rootContainer = resolveAppShellRootContainerRow(layout);
  if (rootContainer && isContainerComponent(rootContainer.component)) {
    const stackDirection = rootContainer.component.stackDirection ?? "row";
    const rootStyles = rootContainer.component.styles;
    const containerStyles = resolveRowWrapperStyleRules(rootStyles);

    return (
      <footer
        className={cn(
          FOOTER_HOST_STRUCTURAL_CLASS_NAME,
          stackDirection === "row" ? "flex-row items-center" : "flex-col",
          containerRowWrapperClassName(rootStyles, stackDirection),
          chromeDisplayClassName,
          containerStyles.className,
        )}
        style={containerStyles.style}
        data-layout-row-id={rootContainer.id}
      >
        <ResponsiveStyleTag cssText={containerStyles.cssText} />
        <RecursiveLayoutRenderer
          layout={layout}
          context={context}
          flattenScreenRoot
          promotedContainerRowId={rootContainer.id}
        />
      </footer>
    );
  }

  return (
    <footer
      className={cn(
        FOOTER_HOST_DEFAULT_CHROME_CLASS_NAME,
        chromeDisplayClassName,
      )}
    >
      <RecursiveLayoutRenderer layout={layout} context={context} />
    </footer>
  );
}
