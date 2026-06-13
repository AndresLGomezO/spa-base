import { useMediaQuery } from "./useMediaQuery.js";

export const MOBILE_BREAKPOINT = 768;

const NARROW_VIEWPORT_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
const TOUCH_DEVICE_QUERY = "(hover: none) and (pointer: coarse)";

export function usePreferNativePickers(): boolean {
  const isNarrowViewport = useMediaQuery(NARROW_VIEWPORT_QUERY);
  const isTouchDevice = useMediaQuery(TOUCH_DEVICE_QUERY);
  return isNarrowViewport || isTouchDevice;
}
