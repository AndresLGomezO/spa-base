import { SegmentedSwitch } from "@repo/ui";
import type { ColorScheme } from "@repo/theme/react";
import { useTranslation } from "react-i18next";
import { cn } from "@repo/theme/utils";

import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";

interface SidebarLayoutDesignerPreviewThemeSelectProps {
  readonly className?: string;
}

export function SidebarLayoutDesignerPreviewThemeSelect({
  className,
}: SidebarLayoutDesignerPreviewThemeSelectProps) {
  const { t } = useTranslation("common");
  const { previewColorScheme, setPreviewColorScheme } =
    useSidebarLayoutDesigner();
  const label = t("formDesigner.previewTheme");

  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <SegmentedSwitch<ColorScheme>
        value={previewColorScheme}
        ariaLabel={label}
        options={[
          {
            value: "light",
            label: t("theme.light"),
            ariaLabel: t("theme.light"),
          },
          {
            value: "dark",
            label: t("theme.dark"),
            ariaLabel: t("theme.dark"),
          },
        ]}
        onChange={setPreviewColorScheme}
      />
    </div>
  );
}
