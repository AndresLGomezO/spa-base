import { resolvePreviewStrategy } from "@repo/ui-builder-core";
import { SidebarProvider } from "@repo/ui";
import { useMemo, useRef } from "react";

import { DesignedAppHeader } from "../../components/sidebar/DesignedAppSidebar";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { AppShellLayoutStructureOverlay } from "./AppShellLayoutStructureOverlay";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { SidebarLayoutDesignerPreviewThemeSelect } from "./SidebarLayoutDesignerPreviewThemeSelect";

interface HeaderLayoutDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function HeaderLayoutDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: HeaderLayoutDesignerUnifiedPreviewPanelProps) {
  const { editor, previewColorScheme } = useSidebarLayoutDesigner();
  const frameRef = useRef<HTMLDivElement>(null);

  const previewStrategy = useMemo(
    () => resolvePreviewStrategy("headerLayout"),
    [],
  );

  const layout = editor.headerLayout;

  const previewBody = (
    <AppShellLayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={withStructureChrome}
      className="border-border bg-background relative w-full overflow-visible rounded-lg border shadow-sm"
      captureClicks
    >
      <SidebarProvider>
        <DesignedAppHeader layout={layout} />
      </SidebarProvider>
    </AppShellLayoutStructureOverlay>
  );

  return (
    <UnifiedDesignerPreviewPanel
      strategy={previewStrategy}
      fillHeight={withStructureChrome}
      colorScheme={previewColorScheme}
      themeControls={<SidebarLayoutDesignerPreviewThemeSelect />}
      previewBody={previewBody}
    />
  );
}
