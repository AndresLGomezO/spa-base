import type { CSSProperties } from "react";
import type { StyleRule } from "@repo/ui-builder-core";
import { resolvePageSlotWrapper } from "@repo/ui-builder-core";

export function applyMetricWidgetStyleWrapper(
  styles: readonly StyleRule[] | undefined,
  className?: string,
): { className: string; style: CSSProperties } {
  const wrapper = resolvePageSlotWrapper(styles, className);
  return {
    className: wrapper.className,
    style: wrapper.style,
  };
}
