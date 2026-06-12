export type MobilePreviewDeviceBrand =
  | "apple"
  | "samsung"
  | "google"
  | "xiaomi"
  | "oneplus"
  | "honor";

export type MobilePreviewDeviceId =
  | "iphone-17-pro-max"
  | "iphone-16-pro-max"
  | "iphone-16-pro"
  | "iphone-16"
  | "iphone-se"
  | "galaxy-s25-ultra"
  | "galaxy-s24"
  | "galaxy-a54"
  | "pixel-9-pro"
  | "pixel-8"
  | "xiaomi-15"
  | "redmi-note-13"
  | "oneplus-13"
  | "honor-400";

export type MobilePreviewDeviceFrameStyle =
  | "iphone-dynamic-island"
  | "iphone-classic"
  | "android-punch-hole";

export interface MobilePreviewDeviceFrameConfig {
  readonly style: MobilePreviewDeviceFrameStyle;
  readonly bezelTop: number;
  readonly bezelRight: number;
  readonly bezelBottom: number;
  readonly bezelLeft: number;
  readonly screenCornerRadius: number;
  readonly chassisCornerRadius: number;
  /** Simulated safe-area inset at the top of the CSS viewport. */
  readonly safeAreaTop: number;
}

export interface MobilePreviewDevicePreset {
  readonly id: MobilePreviewDeviceId;
  readonly brand: MobilePreviewDeviceBrand;
  readonly labelKey: `formDesigner.previewDevices.${MobilePreviewDeviceId}`;
  /** CSS logical viewport width (dp/pt). */
  readonly width: number;
  /** CSS logical viewport height (dp/pt). */
  readonly height: number;
  /** Native panel width in physical pixels (reference). */
  readonly physicalWidth: number;
  /** Native panel height in physical pixels (reference). */
  readonly physicalHeight: number;
  readonly frame: MobilePreviewDeviceFrameConfig;
}

const MOBILE_PREVIEW_FRAME_MAX_HEIGHT_PX = 640;

const IPHONE_DYNAMIC_ISLAND_FRAME: MobilePreviewDeviceFrameConfig = {
  style: "iphone-dynamic-island",
  bezelTop: 12,
  bezelRight: 10,
  bezelBottom: 14,
  bezelLeft: 10,
  screenCornerRadius: 44,
  chassisCornerRadius: 52,
  safeAreaTop: 59,
};

const IPHONE_CLASSIC_FRAME: MobilePreviewDeviceFrameConfig = {
  style: "iphone-classic",
  bezelTop: 18,
  bezelRight: 14,
  bezelBottom: 22,
  bezelLeft: 14,
  screenCornerRadius: 0,
  chassisCornerRadius: 40,
  safeAreaTop: 20,
};

const ANDROID_PUNCH_HOLE_FRAME: MobilePreviewDeviceFrameConfig = {
  style: "android-punch-hole",
  bezelTop: 12,
  bezelRight: 10,
  bezelBottom: 14,
  bezelLeft: 10,
  screenCornerRadius: 28,
  chassisCornerRadius: 36,
  safeAreaTop: 24,
};

export const MOBILE_PREVIEW_DEVICE_BRAND_ORDER: readonly MobilePreviewDeviceBrand[] =
  ["apple", "samsung", "google", "xiaomi", "oneplus", "honor"];

export const MOBILE_PREVIEW_DEVICE_PRESETS: readonly MobilePreviewDevicePreset[] =
  [
    {
      id: "iphone-17-pro-max",
      brand: "apple",
      labelKey: "formDesigner.previewDevices.iphone-17-pro-max",
      width: 430,
      height: 932,
      physicalWidth: 1320,
      physicalHeight: 2868,
      frame: IPHONE_DYNAMIC_ISLAND_FRAME,
    },
    {
      id: "iphone-16-pro-max",
      brand: "apple",
      labelKey: "formDesigner.previewDevices.iphone-16-pro-max",
      width: 430,
      height: 932,
      physicalWidth: 1320,
      physicalHeight: 2868,
      frame: IPHONE_DYNAMIC_ISLAND_FRAME,
    },
    {
      id: "iphone-16-pro",
      brand: "apple",
      labelKey: "formDesigner.previewDevices.iphone-16-pro",
      width: 393,
      height: 852,
      physicalWidth: 1179,
      physicalHeight: 2556,
      frame: IPHONE_DYNAMIC_ISLAND_FRAME,
    },
    {
      id: "iphone-16",
      brand: "apple",
      labelKey: "formDesigner.previewDevices.iphone-16",
      width: 390,
      height: 844,
      physicalWidth: 1170,
      physicalHeight: 2532,
      frame: IPHONE_DYNAMIC_ISLAND_FRAME,
    },
    {
      id: "iphone-se",
      brand: "apple",
      labelKey: "formDesigner.previewDevices.iphone-se",
      width: 375,
      height: 667,
      physicalWidth: 750,
      physicalHeight: 1334,
      frame: IPHONE_CLASSIC_FRAME,
    },
    {
      id: "galaxy-s25-ultra",
      brand: "samsung",
      labelKey: "formDesigner.previewDevices.galaxy-s25-ultra",
      width: 480,
      height: 1040,
      physicalWidth: 1440,
      physicalHeight: 3120,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "galaxy-s24",
      brand: "samsung",
      labelKey: "formDesigner.previewDevices.galaxy-s24",
      width: 360,
      height: 780,
      physicalWidth: 1080,
      physicalHeight: 2340,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "galaxy-a54",
      brand: "samsung",
      labelKey: "formDesigner.previewDevices.galaxy-a54",
      width: 360,
      height: 800,
      physicalWidth: 1080,
      physicalHeight: 2340,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "pixel-9-pro",
      brand: "google",
      labelKey: "formDesigner.previewDevices.pixel-9-pro",
      width: 412,
      height: 915,
      physicalWidth: 1344,
      physicalHeight: 2992,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "pixel-8",
      brand: "google",
      labelKey: "formDesigner.previewDevices.pixel-8",
      width: 412,
      height: 915,
      physicalWidth: 1080,
      physicalHeight: 2400,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "xiaomi-15",
      brand: "xiaomi",
      labelKey: "formDesigner.previewDevices.xiaomi-15",
      width: 412,
      height: 915,
      physicalWidth: 1200,
      physicalHeight: 2670,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "redmi-note-13",
      brand: "xiaomi",
      labelKey: "formDesigner.previewDevices.redmi-note-13",
      width: 393,
      height: 873,
      physicalWidth: 1080,
      physicalHeight: 2400,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "oneplus-13",
      brand: "oneplus",
      labelKey: "formDesigner.previewDevices.oneplus-13",
      width: 412,
      height: 919,
      physicalWidth: 1440,
      physicalHeight: 3168,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
    {
      id: "honor-400",
      brand: "honor",
      labelKey: "formDesigner.previewDevices.honor-400",
      width: 360,
      height: 800,
      physicalWidth: 1080,
      physicalHeight: 2412,
      frame: ANDROID_PUNCH_HOLE_FRAME,
    },
  ];

/** Standard phone baseline used when mobile preview first opens. */
export const DEFAULT_MOBILE_PREVIEW_DEVICE_ID: MobilePreviewDeviceId =
  "iphone-16";

const MOBILE_PREVIEW_DEVICE_BY_ID = new Map(
  MOBILE_PREVIEW_DEVICE_PRESETS.map((preset) => [preset.id, preset]),
);

export function resolveMobilePreviewDevice(
  id: MobilePreviewDeviceId,
): MobilePreviewDevicePreset {
  const preset = MOBILE_PREVIEW_DEVICE_BY_ID.get(id);
  if (!preset) {
    return MOBILE_PREVIEW_DEVICE_BY_ID.get(DEFAULT_MOBILE_PREVIEW_DEVICE_ID)!;
  }
  return preset;
}

export function resolveMobilePreviewChassisSize(
  device: MobilePreviewDevicePreset,
): {
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly chassisWidth: number;
  readonly chassisHeight: number;
} {
  return {
    screenWidth: device.width,
    screenHeight: device.height,
    chassisWidth:
      device.width + device.frame.bezelLeft + device.frame.bezelRight,
    chassisHeight:
      device.height + device.frame.bezelTop + device.frame.bezelBottom,
  };
}

interface MobilePreviewDisplayMetrics {
  /** Exact CSS viewport used for responsive layout inside the frame. */
  readonly screenWidth: number;
  readonly screenHeight: number;
  /** Natural chassis size before any display scaling. */
  readonly chassisWidth: number;
  readonly chassisHeight: number;
  /** Uniform scale applied to fit the preview panel while preserving aspect ratio. */
  readonly displayScale: number;
  readonly displayChassisWidth: number;
  readonly displayChassisHeight: number;
}

export function resolveMobilePreviewDisplayMetrics(
  device: MobilePreviewDevicePreset,
  maxChassisHeightPx = MOBILE_PREVIEW_FRAME_MAX_HEIGHT_PX,
): MobilePreviewDisplayMetrics {
  const { screenWidth, screenHeight, chassisWidth, chassisHeight } =
    resolveMobilePreviewChassisSize(device);

  const displayScale =
    chassisHeight > maxChassisHeightPx ? maxChassisHeightPx / chassisHeight : 1;

  return {
    screenWidth,
    screenHeight,
    chassisWidth,
    chassisHeight,
    displayScale,
    displayChassisWidth: chassisWidth * displayScale,
    displayChassisHeight: chassisHeight * displayScale,
  };
}

export function groupMobilePreviewDevicesByBrand(): Readonly<
  Record<MobilePreviewDeviceBrand, readonly MobilePreviewDevicePreset[]>
> {
  const grouped: Record<MobilePreviewDeviceBrand, MobilePreviewDevicePreset[]> =
    {
      apple: [],
      samsung: [],
      google: [],
      xiaomi: [],
      oneplus: [],
      honor: [],
    };

  for (const preset of MOBILE_PREVIEW_DEVICE_PRESETS) {
    grouped[preset.brand].push(preset);
  }

  return grouped;
}
