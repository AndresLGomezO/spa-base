import type { ColorScheme } from "@repo/theme/react";
import type { PreviewStrategy } from "@repo/ui-builder-core";
import type { ReactNode } from "react";

import { FormDesignerPreviewThemeScope } from "../form-designer/FormDesignerPreviewThemeScope";
import { DesignerPreviewPanelShell } from "../ui-builder/DesignerPreviewPanelShell";
import { PreviewContextBar } from "./PreviewContextBar";
import { PreviewContextProvider } from "./PreviewContextProvider";
import { PreviewFrame } from "./PreviewFrame";

interface UnifiedDesignerPreviewPanelProps {
  readonly strategy: PreviewStrategy;
  readonly previewBody: ReactNode;
  readonly colorScheme: ColorScheme;
  readonly themeControls?: ReactNode;
  readonly fillHeight?: boolean;
}

export function UnifiedDesignerPreviewPanel({
  strategy,
  previewBody,
  colorScheme,
  themeControls,
  fillHeight = false,
}: UnifiedDesignerPreviewPanelProps) {
  return (
    <DesignerPreviewPanelShell fillHeight={fillHeight}>
      <FormDesignerPreviewThemeScope colorScheme={colorScheme}>
        <PreviewContextProvider strategy={strategy}>
          <PreviewContextBar themeControls={themeControls}>
            <PreviewFrame>{previewBody}</PreviewFrame>
          </PreviewContextBar>
        </PreviewContextProvider>
      </FormDesignerPreviewThemeScope>
    </DesignerPreviewPanelShell>
  );
}
