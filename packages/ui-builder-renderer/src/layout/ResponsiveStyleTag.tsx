import type { ReactNode } from "react";

/** Injects scoped responsive CSS emitted by resolveStyleRules when present. */
export function ResponsiveStyleTag(props: {
  readonly cssText: string | undefined;
}): ReactNode {
  if (!props.cssText) {
    return null;
  }

  return <style>{props.cssText}</style>;
}
