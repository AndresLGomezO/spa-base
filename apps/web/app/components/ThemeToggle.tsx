import { useColorScheme, useDarkMode } from "@repo/theme/react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { t } = useTranslation("common");
  const { toggleColorScheme } = useColorScheme();
  const isDark = useDarkMode();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
      onClick={toggleColorScheme}
      className="border-border bg-background text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md border px-3 py-1.5 text-sm shadow-sm"
    >
      {isDark ? t("theme.light") : t("theme.dark")}
    </button>
  );
}
