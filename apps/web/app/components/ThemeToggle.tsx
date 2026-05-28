import { MoonIcon, SegmentedSwitch, SunIcon } from "@repo/ui";
import { useColorScheme, useDarkMode } from "@repo/theme/react";
import { useTranslation } from "react-i18next";

interface ThemeToggleProps {
  readonly fullWidth?: boolean;
}

export function ThemeToggle({ fullWidth = false }: ThemeToggleProps) {
  const { t } = useTranslation("common");
  const { setColorScheme } = useColorScheme();
  const isDark = useDarkMode();

  return (
    <SegmentedSwitch
      value={isDark ? "dark" : "light"}
      onChange={(scheme) => setColorScheme(scheme)}
      ariaLabel={t("theme.label")}
      fullWidth={fullWidth}
      options={[
        {
          value: "light",
          ariaLabel: t("theme.switchToLight"),
          label: (
            <>
              <SunIcon />
              <span>{t("theme.light")}</span>
            </>
          ),
        },
        {
          value: "dark",
          ariaLabel: t("theme.switchToDark"),
          label: (
            <>
              <MoonIcon />
              <span>{t("theme.dark")}</span>
            </>
          ),
        },
      ]}
    />
  );
}
