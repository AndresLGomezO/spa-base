import type { PreviewDevice } from "@repo/ui-builder-core";
import {
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS,
  resolveResponsiveBreakpointForWidth,
  type ResponsiveGridBreakpoint,
} from "@repo/ui-builder-core";
import { CollapsibleSegmentedSwitcher, Text } from "@repo/ui";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { usePreviewContext } from "./PreviewContextProvider";

interface PreviewContextBarProps {
  readonly children: ReactNode;
  readonly themeControls?: ReactNode;
}

type PreviewDeviceLabelKey =
  | "unifiedBuilder.preview.devices.mobile"
  | "unifiedBuilder.preview.devices.tablet"
  | "unifiedBuilder.preview.devices.desktop";

const PREVIEW_DEVICE_LABEL_KEYS: Record<PreviewDevice, PreviewDeviceLabelKey> =
  {
    mobile: "unifiedBuilder.preview.devices.mobile",
    tablet: "unifiedBuilder.preview.devices.tablet",
    desktop: "unifiedBuilder.preview.devices.desktop",
  };

type PreviewBreakpointLabelKey =
  | "unifiedBuilder.preview.breakpoints.base"
  | "unifiedBuilder.preview.breakpoints.sm"
  | "unifiedBuilder.preview.breakpoints.md"
  | "unifiedBuilder.preview.breakpoints.lg"
  | "unifiedBuilder.preview.breakpoints.xl";

const PREVIEW_BREAKPOINT_LABEL_KEYS: Record<
  ResponsiveGridBreakpoint,
  PreviewBreakpointLabelKey
> = {
  base: "unifiedBuilder.preview.breakpoints.base",
  sm: "unifiedBuilder.preview.breakpoints.sm",
  md: "unifiedBuilder.preview.breakpoints.md",
  lg: "unifiedBuilder.preview.breakpoints.lg",
  xl: "unifiedBuilder.preview.breakpoints.xl",
};

function PreviewDeviceSwitcher() {
  const { t } = useTranslation("common");
  const { strategy, activeDevice, setActiveDevice } = usePreviewContext();

  const switcherOptions = useMemo(() => {
    if (strategy.type !== "device") {
      return [];
    }

    return strategy.devices.map((device) => ({
      value: device,
      label: t(PREVIEW_DEVICE_LABEL_KEYS[device]),
      ariaLabel: t(PREVIEW_DEVICE_LABEL_KEYS[device]),
    }));
  }, [strategy, t]);

  if (strategy.type !== "device") {
    return null;
  }

  const deviceLabel = t("unifiedBuilder.preview.device");

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{deviceLabel}</span>
      <CollapsibleSegmentedSwitcher
        value={activeDevice}
        ariaLabel={deviceLabel}
        segmentWidth="2.75rem"
        options={switcherOptions}
        onChange={setActiveDevice}
      />
    </div>
  );
}

/**
 * Width strategies expose a screen-size switcher from strategy presets (or the
 * standard breakpoint widths) plus a fine-grained slider.
 */
function PreviewWidthControls() {
  const { t } = useTranslation("common");
  const { strategy, previewWidthPx, setPreviewWidthPx } = usePreviewContext();

  const screenWidths = useMemo(() => {
    if (strategy.type !== "width") {
      return [] as readonly number[];
    }
    const fromPresets = (strategy.presets ?? []).filter(
      (width) => width >= strategy.min && width <= strategy.max,
    );
    const candidates =
      fromPresets.length > 0
        ? fromPresets
        : RESPONSIVE_BREAKPOINT_ORDER.map(
            (bp) => RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS[bp],
          ).filter((width) => width >= strategy.min && width <= strategy.max);

    // One control per breakpoint (largest preset wins when several map to XL).
    const byBreakpoint = new Map<ResponsiveGridBreakpoint, number>();
    for (const width of candidates) {
      byBreakpoint.set(resolveResponsiveBreakpointForWidth(width), width);
    }
    return RESPONSIVE_BREAKPOINT_ORDER.map((bp) => byBreakpoint.get(bp)).filter(
      (width): width is number => width !== undefined,
    );
  }, [strategy]);

  const screenOptions = useMemo(
    () =>
      screenWidths.map((width) => {
        const breakpoint = resolveResponsiveBreakpointForWidth(width);
        const label = t(PREVIEW_BREAKPOINT_LABEL_KEYS[breakpoint]);
        return {
          value: String(width),
          label,
          ariaLabel: `${label} (${width}px)`,
        };
      }),
    [screenWidths, t],
  );

  if (strategy.type !== "width") {
    return null;
  }

  const activeBreakpoint = resolveResponsiveBreakpointForWidth(previewWidthPx);
  const matchingPresetWidth =
    screenWidths.find(
      (width) =>
        resolveResponsiveBreakpointForWidth(width) === activeBreakpoint,
    ) ?? null;
  const screenLabel = t("unifiedBuilder.preview.screenSize");
  const widthLabel = t("unifiedBuilder.preview.width");

  return (
    <div className="flex flex-wrap items-end gap-3">
      {screenOptions.length > 0 ? (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{screenLabel}</span>
          <CollapsibleSegmentedSwitcher
            value={
              matchingPresetWidth !== null ? String(matchingPresetWidth) : ""
            }
            ariaLabel={screenLabel}
            segmentWidth="2.75rem"
            options={screenOptions}
            onChange={(value) => setPreviewWidthPx(Number(value))}
          />
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{widthLabel}</span>
        <input
          type="range"
          min={strategy.min}
          max={strategy.max}
          step={10}
          value={previewWidthPx}
          onChange={(event) => setPreviewWidthPx(Number(event.target.value))}
        />
        <span className="tabular-nums">{previewWidthPx}px</span>
      </label>
    </div>
  );
}

/**
 * Strategy-driven preview controls (Section 15.4, 15.11).
 */
export function PreviewContextBar({
  children,
  themeControls,
}: PreviewContextBarProps) {
  const { t } = useTranslation("common");
  const { strategy } = usePreviewContext();

  const hintKey =
    strategy.type === "device"
      ? "unifiedBuilder.preview.screenHint"
      : "unifiedBuilder.preview.constraintHint";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Text variant="caption" className="text-muted-foreground">
          {t(hintKey)}
        </Text>
        <div className="flex flex-wrap items-center gap-3">
          {themeControls}
          <PreviewDeviceSwitcher />
          <PreviewWidthControls />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
