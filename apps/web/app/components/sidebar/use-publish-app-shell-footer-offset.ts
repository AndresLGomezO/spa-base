import { useLayoutEffect, type RefObject } from "react";

export const APP_SHELL_FOOTER_OFFSET_CSS_VAR = "--app-shell-footer-offset";

/**
 * Publishes the footer host height to `:root` so fixed UI (FAB) and page
 * insets can clear the absolute overlay footer.
 */
export function usePublishAppShellFooterOffset(
  hostRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useLayoutEffect(() => {
    if (!enabled) {
      document.documentElement.style.removeProperty(
        APP_SHELL_FOOTER_OFFSET_CSS_VAR,
      );
      return;
    }

    const element = hostRef.current;
    if (!element) {
      document.documentElement.style.removeProperty(
        APP_SHELL_FOOTER_OFFSET_CSS_VAR,
      );
      return;
    }

    const publish = () => {
      const height = element.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        APP_SHELL_FOOTER_OFFSET_CSS_VAR,
        `${Math.max(0, Math.ceil(height))}px`,
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    window.addEventListener("resize", publish);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
      document.documentElement.style.removeProperty(
        APP_SHELL_FOOTER_OFFSET_CSS_VAR,
      );
    };
  }, [enabled, hostRef]);
}
