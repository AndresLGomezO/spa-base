import type { FormsSliceData } from "@repo/entities";

export function mergeFormsSliceForApply(
  current: FormsSliceData,
  incoming: FormsSliceData,
): FormsSliceData {
  const active = incoming.presentation ?? current.presentation ?? "plain";

  return {
    presentation: active,
    ...(active === "plain"
      ? incoming.layout
        ? { layout: incoming.layout }
        : {}
      : current.layout
        ? { layout: current.layout }
        : {}),
    ...(active === "wizard"
      ? incoming.wizard
        ? { wizard: incoming.wizard }
        : {}
      : current.wizard
        ? { wizard: current.wizard }
        : {}),
    ...(current.modalSize !== undefined || incoming.modalSize !== undefined
      ? { modalSize: current.modalSize ?? incoming.modalSize }
      : {}),
    ...(current.modalSizeByBreakpoint !== undefined ||
    incoming.modalSizeByBreakpoint !== undefined
      ? {
          modalSizeByBreakpoint:
            current.modalSizeByBreakpoint ?? incoming.modalSizeByBreakpoint,
        }
      : {}),
    ...(current.modalChrome !== undefined || incoming.modalChrome !== undefined
      ? { modalChrome: current.modalChrome ?? incoming.modalChrome }
      : {}),
    ...(incoming.modalFooterLayout !== undefined ||
    current.modalFooterLayout !== undefined
      ? {
          modalFooterLayout:
            incoming.modalFooterLayout ?? current.modalFooterLayout,
        }
      : {}),
  };
}
