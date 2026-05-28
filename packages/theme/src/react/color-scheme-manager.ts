import { COLOR_SCHEME_KEY } from "./constants";

export type ColorScheme = "light" | "dark";

export type ColorSchemeManager = {
  get: () => ColorScheme;
  set: (colorScheme: ColorScheme) => void;
  toggle: () => void;
};

export const defaultColorSchemeManager: ColorSchemeManager = {
  get: () => {
    if (typeof window === "undefined" || !window.localStorage) {
      return "light";
    }

    const stored = window.localStorage.getItem(
      COLOR_SCHEME_KEY,
    ) as ColorScheme | null;

    return stored ?? "light";
  },
  set: (colorScheme: ColorScheme) => {
    if (typeof window === "undefined" || !window.document) {
      return;
    }

    if (colorScheme === "dark") {
      window.document.documentElement.classList.add("dark");
    } else {
      window.document.documentElement.classList.remove("dark");
    }

    window.localStorage?.setItem(COLOR_SCHEME_KEY, colorScheme);
  },
  toggle: () => {
    const current = defaultColorSchemeManager.get();
    defaultColorSchemeManager.set(current === "light" ? "dark" : "light");
  },
};
