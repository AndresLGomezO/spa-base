import { useContext } from "react";

import { ThemeContext } from "./theme-context";

export function useColorScheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useColorScheme must be used within a ThemeProvider");
  }

  return context;
}

export function useDarkMode() {
  const { colorScheme } = useColorScheme();

  return colorScheme === "dark";
}
