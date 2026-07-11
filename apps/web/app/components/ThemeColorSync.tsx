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

function isAppleMobile(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Keep viewport-fit=cover even if a stale SW-served document omitted it. */
export function ensureViewportFitCover(): void {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, viewport-fit=cover",
    );
    document.head.appendChild(meta);
    return;
  }

  const content = viewport.getAttribute("content") ?? "";
  if (!/viewport-fit\s*=\s*cover/i.test(content)) {
    viewport.setAttribute(
      "content",
      `${content.replace(/,?\s*$/, "")}, viewport-fit=cover`,
    );
  }
}

/**
 * Keeps PWA/system chrome in sync with the app theme so status/nav bars
 * match the active scheme and clock icons stay readable.
 */
export function ThemeColorSync() {
  const { colorScheme } = useColorScheme();
  const { tenantAppearance, isAuthenticated, isSessionResolved } = useAuth();

  useLayoutEffect(() => {
    ensureViewportFitCover();

    const root = document.documentElement;
    root.style.colorScheme = colorScheme;

    const sync = () => {
      const background = resolvePageBackgroundColor(colorScheme);
      const htmlBackgroundImage = getComputedStyle(root).backgroundImage.trim();
      const hasGradient =
        htmlBackgroundImage !== "" && htmlBackgroundImage !== "none";

      // Always solid — Android derives status-bar fill and icon contrast from
      // theme-color luminance. Transparent breaks theme matching.
      upsertMeta("theme-color", background);

      // Align solid html/body fill when not using a branded gradient.
      if (!hasGradient) {
        root.style.backgroundColor = background;
        document.body.style.backgroundColor = background;
      }

      // iOS: black-translucent always uses light status icons — only safe on dark.
      // Android: color-scheme + matching theme-color drive icon contrast.
      if (isAppleMobile()) {
        upsertMeta(
          "apple-mobile-web-app-status-bar-style",
          colorScheme === "dark" ? "black-translucent" : "default",
        );
      } else {
        upsertMeta(
          "apple-mobile-web-app-status-bar-style",
          "black-translucent",
        );
      }
    };

    sync();
    // Branding/CSS variables can settle a frame (or two) after scheme toggles.
    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      sync();
      frame2 = window.requestAnimationFrame(sync);
    });
    const timeout = window.setTimeout(sync, 100);
    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearTimeout(timeout);
    };
  }, [colorScheme, isAuthenticated, isSessionResolved, tenantAppearance]);

  return null;
}
