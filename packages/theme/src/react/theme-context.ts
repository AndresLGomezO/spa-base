import { createContext } from "react";

import {
  type ColorScheme,
  type ColorSchemeManager,
  defaultColorSchemeManager,
} from "./color-scheme-manager";

export type ThemeContextState = {
  colorScheme: ColorScheme;
  setColorScheme: (colorScheme: ColorScheme) => void;
  toggleColorScheme: () => void;
};

export const ThemeContext = createContext<ThemeContextState>({
  colorScheme: "light",
  setColorScheme: () => {
    defaultColorSchemeManager.set("light");
  },
  toggleColorScheme: () => {
    defaultColorSchemeManager.toggle();
  },
});
