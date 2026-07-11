import { useLayoutEffect } from "react";

import { useColorScheme } from "@repo/theme/react";

import { useAuth } from "../auth/AuthContext";

/**
 * Keeps the PWA/browser `theme-color` meta aligned with the painted page
 * background so system chrome (status bar / gesture bar) blends edge-to-edge.
 */
export function ThemeColorSync() {
  const { colorScheme } = useColorScheme();
  const { tenantAppearance, isAuthenticated, isSessionResolved } = useAuth();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = colorScheme;

    const syncThemeColor = () => {
      const background = getComputedStyle(document.body).backgroundColor;
      if (!background || background === "rgba(0, 0, 0, 0)") {
        return;
      }

      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", background);
    };

    syncThemeColor();

    // Tenant branding / CSS variables can settle a frame later.
    const frame = window.requestAnimationFrame(syncThemeColor);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [colorScheme, isAuthenticated, isSessionResolved, tenantAppearance]);

  return null;
}
