import type { DesignLayoutEntityKind } from "./design-layout-kind";

const DESIGN_LAYOUT_KIND_PATH_SEGMENT: Record<DesignLayoutEntityKind, string> =
  {
    main: "main",
    list: "list",
    detail: "detail",
    forms: "forms",
    metrics: "metrics",
  };

export function designLayoutKindPath(kind: DesignLayoutEntityKind): string {
  return `/settings/design-layout/${DESIGN_LAYOUT_KIND_PATH_SEGMENT[kind]}`;
}
