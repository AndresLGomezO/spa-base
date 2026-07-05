import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PreviewDevice, PreviewStrategy } from "@repo/ui-builder-core";
import { DEFAULT_PREVIEW_WIDTH_PX } from "@repo/ui-builder-core";

interface PreviewContextValue {
  readonly strategy: PreviewStrategy;
  readonly activeDevice: PreviewDevice;
  readonly setActiveDevice: (device: PreviewDevice) => void;
  readonly previewWidthPx: number;
  readonly setPreviewWidthPx: (width: number) => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

interface PreviewContextProviderProps {
  readonly strategy: PreviewStrategy;
  readonly children: ReactNode;
}

function resolveInitialDevice(strategy: PreviewStrategy): PreviewDevice {
  if (strategy.type === "device" && strategy.devices.length > 0) {
    return strategy.devices[0];
  }

  return "desktop";
}

function resolveInitialPreviewWidth(strategy: PreviewStrategy): number {
  if (strategy.type === "width") {
    return strategy.default;
  }

  return DEFAULT_PREVIEW_WIDTH_PX;
}

function clampPreviewWidth(strategy: PreviewStrategy, width: number): number {
  if (strategy.type === "width") {
    return Math.min(strategy.max, Math.max(strategy.min, width));
  }

  return width;
}

export function PreviewContextProvider({
  strategy,
  children,
}: PreviewContextProviderProps) {
  const [activeDevice, setActiveDeviceState] = useState(() =>
    resolveInitialDevice(strategy),
  );
  const [previewWidthPx, setPreviewWidthPxState] = useState(() =>
    resolveInitialPreviewWidth(strategy),
  );

  useEffect(() => {
    setActiveDeviceState(resolveInitialDevice(strategy));
    setPreviewWidthPxState(resolveInitialPreviewWidth(strategy));
  }, [strategy]);

  const setActiveDevice = useCallback(
    (device: PreviewDevice) => {
      if (strategy.type !== "device") {
        return;
      }

      if (!strategy.devices.includes(device)) {
        return;
      }

      setActiveDeviceState(device);
    },
    [strategy],
  );

  const setPreviewWidthPx = useCallback(
    (width: number) => {
      setPreviewWidthPxState(clampPreviewWidth(strategy, width));
    },
    [strategy],
  );

  const value = useMemo(
    (): PreviewContextValue => ({
      strategy,
      activeDevice,
      setActiveDevice,
      previewWidthPx,
      setPreviewWidthPx,
    }),
    [
      activeDevice,
      previewWidthPx,
      setActiveDevice,
      setPreviewWidthPx,
      strategy,
    ],
  );

  return (
    <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
  );
}

export function usePreviewContext(): PreviewContextValue {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error(
      "usePreviewContext must be used within PreviewContextProvider",
    );
  }
  return context;
}
