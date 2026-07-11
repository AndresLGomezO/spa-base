import { useLayoutEffect } from "react";

import { useColorScheme } from "@repo/theme/react";

import { useAuth } from "../auth/AuthContext";

function isUsableColor(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(
    trimmed &&
      trimmed !== "transparent" &&
      trimmed !== "rgba(0, 0, 0, 0)" &&
      !trimmed.includes("var("),
  );
}

/** Resolve the painted page background for PWA/system chrome. */
export function resolvePageBackgroundColor(
  colorScheme: "light" | "dark",
): string {
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-background")
    .trim();
  if (isUsableColor(token)) {
    return token;
  }

  for (const element of [document.body, document.documentElement]) {
    const background = getComputedStyle(element).backgroundColor;
    if (isUsableColor(background)) {
      return background;
    }
  }

  return colorScheme === "dark" ? "#0a0a0a" : "#ffffff";
}

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

/**
 * Keeps PWA/system chrome in sync with the app theme:
 * - `theme-color` matches the page background (Android icon contrast + seam-free bars)
 * - iOS status-bar style switches so light mode gets dark clock icons
 */
export function ThemeColorSync() {
  const { colorScheme } = useColorScheme();
  const { tenantAppearance, isAuthenticated, isSessionResolved } = useAuth();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = colorScheme;

    const sync = () => {
      const background = resolvePageBackgroundColor(colorScheme);
      upsertMeta("theme-color", background);
      // `default` → dark status icons (light themes). `black-translucent` →
      // light icons over edge-to-edge content (dark themes).
      upsertMeta(
        "apple-mobile-web-app-status-bar-style",
        colorScheme === "dark" ? "black-translucent" : "default",
      );
    };

    sync();
    // Branding/CSS variables can settle a frame later after scheme toggles.
    const frame = window.requestAnimationFrame(sync);
    const timeout = window.setTimeout(sync, 50);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [colorScheme, isAuthenticated, isSessionResolved, tenantAppearance]);

  return null;
}
