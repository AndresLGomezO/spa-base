import type { ReactNode, RefObject } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import { LayoutStructureOverlay } from "../form-designer/LayoutStructureOverlay";
import { useLayoutStructureOverlayAdapters } from "../form-designer/use-layout-structure-overlay-adapters";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { useOptionalSidebarLayoutDesignerStructureSession } from "./SidebarLayoutDesignerStructureSession";

interface AppShellLayoutStructureOverlayProps {
  readonly frameRef: RefObject<HTMLDivElement | null>;
  readonly layout: UiLayoutDocument;
  readonly enabled: boolean;
  readonly className?: string;
  readonly captureClicks?: boolean;
  readonly children: ReactNode;
}

/**
 * App-shell designer adapter around the shared layout-neutral structure overlay
 * (header / sidebar / footer).
 */
export function AppShellLayoutStructureOverlay({
  frameRef,
  layout,
  enabled,
  className,
  captureClicks = true,
  children,
}: AppShellLayoutStructureOverlayProps) {
  const { requestComponentRowPanel, requestComponentColumnPanel } =
    useSidebarLayoutDesigner();
  const structureSession = useOptionalSidebarLayoutDesignerStructureSession();
  const adapters = useLayoutStructureOverlayAdapters({
    enabled,
    layout,
    structureSession,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    captureClicks,
  });

  return (
    <LayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={enabled}
      adapters={adapters}
      className={className}
    >
      {children}
    </LayoutStructureOverlay>
  );
}
