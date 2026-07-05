import type { PreviewDevice } from "@repo/ui-builder-core";
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

function PreviewWidthSlider() {
  const { t } = useTranslation("common");
  const { strategy, previewWidthPx, setPreviewWidthPx } = usePreviewContext();

  if (strategy.type !== "width") {
    return null;
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        {t("unifiedBuilder.preview.width")}
      </span>
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
          <PreviewWidthSlider />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
