/** Fills the tab panel and keeps tree + preview within the visible viewport. */
export const designerTreeTabRootClassName =
  "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden";

/** Tree column + preview row inside a designer tree tab. */
export const designerTreeWorkbenchClassName =
  "flex min-h-0 flex-1 gap-4 overflow-hidden";

/** Preview column wrapper in designer tree workbench rows. */
export const designerPreviewColumnClassName =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden";

/** Properties rail in unified builder workbench (Section 15.7). */
export const designerPropertiesColumnClassName =
  "border-border bg-card flex h-full min-h-0 w-80 shrink-0 flex-col gap-3 overflow-hidden rounded-lg border p-4";

/** Card shell wrapping designer preview panels (header + scrollable body). */
export const designerPreviewPanelShellClassName =
  "bg-card border-border flex flex-col gap-3 rounded-lg border p-4";

export const designerPreviewPanelShellFillClassName =
  "h-full min-h-0 overflow-hidden";

export const designerPreviewPanelHeaderClassName =
  "flex shrink-0 flex-wrap items-start justify-between gap-3";

/** Preview body when the tab panel scrolls (e.g. settings). */
export const designerPreviewPanelBodyClassName =
  "min-h-96 overflow-y-auto overflow-x-hidden py-2";

/** Preview body when filling the designer workbench viewport height. */
export const designerPreviewPanelBodyFillClassName =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2";

/** Stretches preview content to at least the shell body height (scroll stays on the shell). */
export const designerPreviewContentFillClassName =
  "flex min-h-full w-full flex-1 flex-col";

/** Aside shell for structure tree panels (expanded or collapsed). */
export const designerTreePanelShellClassName =
  "h-full min-h-0 max-h-full self-stretch overflow-hidden";
