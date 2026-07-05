import type { PreviewDevice } from "@repo/ui-builder-core";
import type { ReactNode } from "react";

import {
  LayoutPreviewViewport,
  type LayoutPreviewBreakpoint,
} from "../ui-builder/LayoutPreviewPanel";
import { usePreviewContext } from "./PreviewContextProvider";

const PREVIEW_DEVICE_BREAKPOINTS: Record<
  PreviewDevice,
  LayoutPreviewBreakpoint
> = {
  mobile: "base",
  tablet: "md",
  desktop: "lg",
};

interface PreviewFrameProps {
  readonly children: ReactNode;
}

/**
 * Applies preview constraints (device viewport, width slider, or fixed) around canvas content.
 */
export function PreviewFrame({ children }: PreviewFrameProps) {
  const { strategy, activeDevice, previewWidthPx } = usePreviewContext();

  switch (strategy.type) {
    case "device":
      return (
        <LayoutPreviewViewport
          breakpoint={PREVIEW_DEVICE_BREAKPOINTS[activeDevice]}
          className="h-full min-h-0 flex-1"
          fillHeight
        >
          {children}
        </LayoutPreviewViewport>
      );
    case "width":
      return (
        <div
          className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          style={{ width: previewWidthPx, maxWidth: previewWidthPx }}
        >
          <LayoutPreviewViewport
            breakpoint="full"
            className="h-full"
            fillHeight
          >
            {children}
          </LayoutPreviewViewport>
        </div>
      );
    case "fixed":
      return (
        <LayoutPreviewViewport
          breakpoint="full"
          className="h-full min-h-0 flex-1"
          fillHeight
        >
          {children}
        </LayoutPreviewViewport>
      );
  }
}
