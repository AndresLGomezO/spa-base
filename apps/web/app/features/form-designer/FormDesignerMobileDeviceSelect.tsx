import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useFormDesigner } from "./form-designer-context";
import {
  groupMobilePreviewDevicesByBrand,
  MOBILE_PREVIEW_DEVICE_BRAND_ORDER,
  type MobilePreviewDeviceId,
} from "./mobile-preview-device-presets";

interface FormDesignerMobileDeviceSelectProps {
  readonly className?: string;
}

function formatDeviceOptionLabel(
  name: string,
  width: number,
  height: number,
): string {
  return `${name} (${width} × ${height})`;
}

export function FormDesignerMobileDeviceSelect({
  className,
}: FormDesignerMobileDeviceSelectProps) {
  const { t } = useTranslation("common");
  const { previewMobileDeviceId, setPreviewMobileDeviceId } = useFormDesigner();
  const devicesByBrand = useMemo(() => groupMobilePreviewDevicesByBrand(), []);
  const label = t("formDesigner.previewDevice");

  return (
    <label className={cn("flex flex-col gap-1 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <Select
        value={previewMobileDeviceId}
        aria-label={label}
        onChange={(event) =>
          setPreviewMobileDeviceId(event.target.value as MobilePreviewDeviceId)
        }
      >
        {MOBILE_PREVIEW_DEVICE_BRAND_ORDER.map((brand) => (
          <optgroup
            key={brand}
            label={t(`formDesigner.previewDevices.brands.${brand}`)}
          >
            {devicesByBrand[brand].map((device) => (
              <option key={device.id} value={device.id}>
                {formatDeviceOptionLabel(
                  t(device.labelKey),
                  device.width,
                  device.height,
                )}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </label>
  );
}
