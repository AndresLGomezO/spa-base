import type { ReactNode } from "react";
import { PreviewBreakpointProvider } from "@repo/ui-builder-renderer";
import { cn } from "@repo/theme/utils";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import {
  resolveMobilePreviewDisplayMetrics,
  type MobilePreviewDeviceFrameStyle,
  type MobilePreviewDevicePreset,
} from "./mobile-preview-device-presets";

function resolveLayoutPreviewRenderBreakpoint(
  breakpoint: LayoutPreviewBreakpoint,
): "base" | "sm" | "md" | "lg" | "xl" {
  return breakpoint === "full" ? "xl" : breakpoint;
}

function DeviceFrameChrome({
  style,
}: {
  readonly style: MobilePreviewDeviceFrameStyle;
}) {
  if (style === "iphone-dynamic-island") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute top-2 left-1/2 z-20 h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      />
    );
  }

  if (style === "android-punch-hole") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute top-2.5 left-1/2 z-20 size-3 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-2 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-black/80"
    />
  );
}

interface MobileDevicePreviewFrameProps {
  readonly device: MobilePreviewDevicePreset;
  readonly breakpoint: LayoutPreviewBreakpoint;
  readonly children: ReactNode;
  readonly className?: string;
  readonly fillHeight?: boolean;
}

export function MobileDevicePreviewFrame({
  device,
  breakpoint,
  children,
  className,
  fillHeight = false,
}: MobileDevicePreviewFrameProps) {
  const renderBreakpoint = resolveLayoutPreviewRenderBreakpoint(breakpoint);
  const {
    screenWidth,
    screenHeight,
    chassisWidth,
    chassisHeight,
    displayScale,
    displayChassisWidth,
    displayChassisHeight,
  } = resolveMobilePreviewDisplayMetrics(device);
  const { frame } = device;

  return (
    <div
      className={cn(
        "max-w-full px-2 py-6",
        fillHeight ? "overflow-x-auto" : "overflow-auto",
        className,
        fillHeight ? "min-h-full" : "min-h-full",
      )}
    >
      <div
        className="mx-auto shrink-0 p-3"
        style={{
          width: displayChassisWidth + 24,
          minHeight: displayChassisHeight + 24,
        }}
      >
        <div
          className="mx-auto box-border flex flex-col bg-zinc-900 shadow-xl ring-1 ring-black/20"
          style={{
            width: chassisWidth,
            height: chassisHeight,
            paddingTop: frame.bezelTop,
            paddingRight: frame.bezelRight,
            paddingBottom: frame.bezelBottom,
            paddingLeft: frame.bezelLeft,
            borderRadius: frame.chassisCornerRadius,
            transform: displayScale < 1 ? `scale(${displayScale})` : undefined,
            transformOrigin: "top center",
          }}
        >
          <div
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
            style={{
              width: screenWidth,
              height: screenHeight,
              borderRadius: frame.screenCornerRadius,
            }}
          >
            <DeviceFrameChrome style={frame.style} />
            <PreviewBreakpointProvider breakpoint={renderBreakpoint}>
              <div
                className="flex h-full min-h-0 flex-1 flex-col"
                style={{ paddingTop: frame.safeAreaTop }}
              >
                {children}
              </div>
            </PreviewBreakpointProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
