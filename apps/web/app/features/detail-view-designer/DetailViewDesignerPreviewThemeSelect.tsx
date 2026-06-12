import { SegmentedSwitch } from "@repo/ui";
import type { ColorScheme } from "@repo/theme/react";
import { useTranslation } from "react-i18next";
import { cn } from "@repo/theme/utils";

import { useDetailViewDesigner } from "./detail-view-designer-context";

interface DetailViewDesignerPreviewThemeSelectProps {
  readonly className?: string;
}

export function DetailViewDesignerPreviewThemeSelect({
  className,
}: DetailViewDesignerPreviewThemeSelectProps) {
  const { t } = useTranslation("common");
  const { previewColorScheme, setPreviewColorScheme } = useDetailViewDesigner();
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
