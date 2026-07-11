import { resolvePreviewStrategy } from "@repo/ui-builder-core";
import { useMemo, useRef } from "react";

import { DesignedSidebarBody } from "../../components/sidebar/DesignedAppSidebar";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { AppShellLayoutStructureOverlay } from "./AppShellLayoutStructureOverlay";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { SidebarLayoutDesignerPreviewThemeSelect } from "./SidebarLayoutDesignerPreviewThemeSelect";

interface SidebarLayoutDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function SidebarLayoutDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: SidebarLayoutDesignerUnifiedPreviewPanelProps) {
  const { editor, previewColorScheme } = useSidebarLayoutDesigner();
  const frameRef = useRef<HTMLDivElement>(null);

  const previewStrategy = useMemo(
    () => resolvePreviewStrategy("sidebarLayout"),
    [],
  );

  // Canonical layout — same DesignedSidebarBody path as runtime DesignedAppSidebar.
  const layout = editor.sidebarLayout;

  const previewBody = (
    <AppShellLayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={withStructureChrome}
      className="bg-sidebar text-sidebar-foreground border-sidebar-border group/sidebar relative flex h-[28rem] w-full flex-col overflow-hidden rounded-lg border shadow-sm"
      captureClicks
    >
      <DesignedSidebarBody layout={layout} />
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
