import type { ReactNode } from "react";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { cn } from "@repo/theme/utils";

import {
  designerPreviewContentFillClassName,
  designerPreviewPanelBodyClassName,
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "./designer-tree-workbench-classes";

interface DesignerPreviewPanelShellProps {
  readonly controls?: ReactNode;
  readonly children: ReactNode;
  readonly fillHeight?: boolean;
}

export function DesignerPreviewPanelShell({
  controls,
  children,
  fillHeight = false,
}: DesignerPreviewPanelShellProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className={cn(
        designerPreviewPanelShellClassName,
        fillHeight && designerPreviewPanelShellFillClassName,
      )}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <Text className="text-muted-foreground text-sm">
          {t("entity.viewSettings.preview")}
        </Text>
        {controls ? (
          <div className="flex flex-wrap items-end gap-3">{controls}</div>
        ) : null}
      </div>
      <div
        className={cn(
          fillHeight
            ? designerPreviewPanelBodyFillClassName
            : designerPreviewPanelBodyClassName,
        )}
      >
        {fillHeight ? (
          <div className={designerPreviewContentFillClassName}>{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
