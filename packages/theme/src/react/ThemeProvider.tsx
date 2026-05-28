import { useCallback, useEffect, useMemo, useState } from "react";

import {
  type ColorScheme,
  type ColorSchemeManager,
  defaultColorSchemeManager,
} from "./color-scheme-manager";
import { ThemeContext, type ThemeContextState } from "./theme-context";

export type ThemeProviderProps = {
  children: React.ReactNode;
  colorScheme?: ColorSchemeManager;
  defaultColorScheme?: ColorScheme;
};

export function ThemeProvider({
  children,
  colorScheme: colorSchemeManager = defaultColorSchemeManager,
  defaultColorScheme = "light",
}: ThemeProviderProps) {
  const [colorScheme, setInternalColorScheme] = useState<ColorScheme>(() => {
    if (typeof window === "undefined") {
      return defaultColorScheme;
    }

    return colorSchemeManager.get() ?? defaultColorScheme;
  });

  const setColorScheme = useCallback(
    (next: ColorScheme) => {
      setInternalColorScheme(next);
      colorSchemeManager.set(next);
    },
    [colorSchemeManager],
  );

  const toggleColorScheme = useCallback(() => {
    setColorScheme(colorScheme === "light" ? "dark" : "light");
  }, [colorScheme, setColorScheme]);

  const context = useMemo<ThemeContextState>(
    () => ({
      colorScheme,
      setColorScheme,
      toggleColorScheme,
    }),
    [colorScheme, setColorScheme, toggleColorScheme],
  );

  useEffect(() => {
    colorSchemeManager.set(colorScheme);
  }, [colorScheme, colorSchemeManager]);

  return (
    <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>
  );
}
