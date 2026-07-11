import type { ReactNode, RefObject } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import { AppShellLayoutStructureOverlay } from "./AppShellLayoutStructureOverlay";

interface FooterLayoutStructureOverlayProps {
  readonly frameRef: RefObject<HTMLDivElement | null>;
  readonly layout: UiLayoutDocument;
  readonly enabled: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Footer designer adapter around the shared layout-neutral structure overlay.
 */
export function FooterLayoutStructureOverlay({
  frameRef,
  layout,
  enabled,
  className,
  children,
}: FooterLayoutStructureOverlayProps) {
  return (
    <AppShellLayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={enabled}
      className={className}
      captureClicks
    >
      {children}
    </AppShellLayoutStructureOverlay>
  );
}
