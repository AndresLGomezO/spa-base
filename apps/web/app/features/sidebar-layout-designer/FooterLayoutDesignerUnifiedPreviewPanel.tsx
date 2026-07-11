import { resolvePreviewStrategy } from "@repo/ui-builder-core";
import { useMemo, useRef } from "react";

import { AppFooter } from "../../components/sidebar/AppFooter";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { FooterLayoutStructureOverlay } from "./FooterLayoutStructureOverlay";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { SidebarLayoutDesignerPreviewThemeSelect } from "./SidebarLayoutDesignerPreviewThemeSelect";

interface FooterLayoutDesignerUnifiedPreviewPanelProps {
  readonly withStructureChrome?: boolean;
}

export function FooterLayoutDesignerUnifiedPreviewPanel({
  withStructureChrome = false,
}: FooterLayoutDesignerUnifiedPreviewPanelProps) {
  const { editor, previewColorScheme } = useSidebarLayoutDesigner();
  const frameRef = useRef<HTMLDivElement>(null);

  const previewStrategy = useMemo(
    () => resolvePreviewStrategy("footerLayout"),
    [],
  );

  // Canonical screen-root layout — never toEditableLayoutDocument on the
  // render path so AppFooter flattenScreenRoot + promotedContainerRowId match runtime.
  const layout = editor.footerLayout;

  const previewBody = (
    <FooterLayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={withStructureChrome}
      // transform keeps position:fixed footer content inside the preview frame.
      className="border-border relative w-full overflow-visible rounded-lg border shadow-sm [transform:translateZ(0)]"
    >
      <div className="bg-muted/40 text-muted-foreground min-h-48 px-3 py-6 text-center text-xs">
        Page content
      </div>
      <AppFooter layout={layout} />
    </FooterLayoutStructureOverlay>
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
