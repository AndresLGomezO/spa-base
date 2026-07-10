import { describe, expect, it } from "vitest";

import {
  resolveParentGridAlignItems,
  resolveParentIsGrid,
  resolveParentStackAlign,
  resolveParentStackDirection,
  resolvePreviewRowChromeLayoutClasses,
  rowPrefersFlexGrow,
  rowUsesContentWidth,
} from "./preview-row-chrome-layout";

describe("preview-row-chrome-layout", () => {
  it("uses absolute inset overlay sizing for overlay image rows", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: false,
      row: {
        type: "component",
        id: "row-chart-overlay",
        component: {
          kind: "image",
          displayMode: "overlay",
          primary: { type: "static", value: "https://example.com/chart.png" },
        },
      },
    });

    expect(classes.shell).toContain("absolute");
    expect(classes.shell).toContain("inset-0");
    expect(classes.shell).not.toContain("relative");
    expect(classes.inner).not.toContain("relative");
    expect(classes.inner).not.toContain("z-0");
  });

  it("uses absolute inset overlay sizing for overlay chart rows", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: false,
      row: {
        type: "component",
        id: "row-income-chart",
        component: {
          kind: "chart",
          chartDefinitionId: "Income trend chart",
          styles: [{ property: "pointerEvents", value: "none" }],
        },
      },
    });

    expect(classes.shell).toContain("absolute");
    expect(classes.shell).toContain("inset-0");
  });

  it("avoids stretch classes for containers with explicit pixel height", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
      row: {
        type: "component",
        id: "container-root",
        component: {
          kind: "container",
          rows: [],
          styles: [{ property: "height", value: "200" }],
        },
      },
    });

    expect(classes.shell).toContain("shrink-0");
    expect(classes.shell).not.toContain("flex-1");
    expect(classes.shell).not.toContain("h-full");
    expect(classes.inner).not.toContain("flex-1");
    expect(classes.inner).not.toContain("h-full");
  });

  it("avoids stretch classes for containers with pixel minHeight", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
      row: {
        type: "component",
        id: "container-root",
        component: {
          kind: "container",
          rows: [],
          styles: [{ property: "minHeight", value: "200" }],
        },
      },
    });

    expect(classes.shell).toContain("shrink-0");
    expect(classes.shell).not.toContain("flex-1");
  });

  it("uses stretch sizing for percentage fill-height containers", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
      row: {
        type: "component",
        id: "container-inner",
        component: {
          kind: "container",
          rows: [],
          styles: [{ property: "height", value: "100%" }],
        },
      },
    });

    expect(classes.shell).toContain("flex-1");
    expect(classes.shell).toContain("h-full");
    expect(classes.inner).toContain("flex-1");
    expect(classes.inner).toContain("h-full");
  });

  it("applies flex-basis split styles on chrome shell for percentage split rows", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
      row: {
        type: "component",
        id: "container-row",
        component: {
          kind: "container",
          rows: [],
          styles: [{ property: "height", value: "60%" }],
        },
      },
    });

    expect(classes.shell).toContain("shrink-0");
    expect(classes.shell).toContain("h-full");
    expect(classes.shell).not.toContain("flex-1");
    expect(classes.inner).toContain("h-full");
    expect(classes.inner).not.toContain("flex-1");
    expect(classes.shellStyle).toEqual({
      flex: "0 0 60%",
      minHeight: "0",
    });
  });

  it("centers grid track rows when parent grid uses alignItems center", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      parentIsGrid: true,
      parentGridAlignItems: "center",
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
      row: {
        type: "component",
        id: "row-greetings-actions",
        component: {
          kind: "container",
          stackDirection: "row",
          rows: [],
          styles: [
            { property: "alignItems", value: "center" },
            { property: "height", value: "100%" },
          ],
        },
      },
    });

    expect(classes.shell).toContain("self-center");
    expect(classes.shell).toContain("shrink-0");
    expect(classes.shell).not.toContain("flex-1");
    expect(classes.shell).not.toContain("h-full");
  });

  it("uses column slot sizing by default in vertical stacks", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: false,
    });

    expect(classes.shell).toContain("flex-1");
    expect(classes.shell).toContain("w-full");
  });

  it("uses content width when parent column aligns to start", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "column",
      parentStackAlign: "start",
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: false,
    });

    expect(classes.shell.split(/\s+/)).toContain("w-fit");
    expect(classes.shell.split(/\s+/)).toContain("shrink-0");
    expect(classes.shell.split(/\s+/)).not.toContain("flex-1");
    expect(classes.shell.split(/\s+/)).not.toContain("w-full");
  });

  it("uses content width for component rows in horizontal stacks", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: true,
    });

    expect(classes.shell.split(/\s+/)).toContain("shrink-0");
    expect(classes.shell).not.toContain("flex-1");
    expect(classes.shell.split(/\s+/)).not.toContain("w-full");
  });

  it("lets structural rows grow inside horizontal stacks", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
    });

    expect(classes.shell).toContain("flex-1");
    expect(classes.shell).not.toContain("w-full");
  });

  it("respects flex: 1 on component styles in horizontal stacks", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      isStructuralRow: false,
      preferFlexGrow: true,
      preferContentWidth: false,
    });

    expect(classes.shell).toContain("flex-1");
  });

  it("uses responsive flex sizing for flex-wrap row children", () => {
    const containerClasses = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      parentUsesFlexWrap: true,
      parentStackStyles: [{ property: "flexWrap", value: "wrap" }],
      row: {
        type: "component",
        id: "container-1",
        component: { kind: "container", rows: [] },
      },
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
    });
    const textClasses = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      parentUsesFlexWrap: true,
      parentStackStyles: [{ property: "flexWrap", value: "wrap" }],
      row: {
        type: "component",
        id: "text-1",
        component: {
          kind: "text",
          primary: { type: "static", value: "Hi" },
        },
      },
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: false,
    });

    expect(containerClasses.shell).toContain("w-fit");
    expect(containerClasses.shell).toContain("basis-auto");
    expect(containerClasses.shell).not.toContain("flex-[1_1_0]");
    expect(textClasses.shell).toContain("shrink-0");
    expect(textClasses.shell).not.toContain("w-fit");
  });

  it("hoists container minWidth onto the flex-wrap shell for wrap math", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      parentUsesFlexWrap: true,
      parentStackStyles: [{ property: "flexWrap", value: "wrap" }],
      row: {
        type: "component",
        id: "container-1",
        component: {
          kind: "container",
          rows: [],
          styles: [
            { property: "minWidth", value: "500" },
            { property: "maxWidth", value: "600" },
          ],
        },
      },
      isStructuralRow: true,
      preferFlexGrow: false,
      preferContentWidth: false,
    });

    expect(classes.shell).toContain("flex-[1_1_auto]");
    expect(classes.shell).toContain("basis-auto");
    expect(classes.shell).not.toContain("w-fit");
    expect(classes.shellStyle).toEqual({
      minWidth: "500px",
      maxWidth: "600px",
    });
  });

  it("grows width-bounded metric widgets between min and max in row stacks", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      parentUsesFlexWrap: true,
      parentStackStyles: [{ property: "flexWrap", value: "wrap" }],
      row: {
        type: "component",
        id: "metric-widget-1",
        component: {
          kind: "metric-widget",
          entityName: "account",
          widgetId: "total-balance-by-month",
          styles: [
            { property: "minWidth", value: "400" },
            { property: "maxWidth", value: "450" },
          ],
        },
      },
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: false,
    });

    expect(classes.shell).toContain("flex-[1_1_auto]");
    expect(classes.shell).toContain("basis-auto");
    expect(classes.shellStyle).toEqual({
      minWidth: "400px",
      maxWidth: "450px",
    });
  });

  it("uses content width for metric-widget rows inside flex-wrap stacks", () => {
    const classes = resolvePreviewRowChromeLayoutClasses({
      parentStackDirection: "row",
      parentUsesFlexWrap: true,
      parentStackStyles: [{ property: "flexWrap", value: "wrap" }],
      row: {
        type: "component",
        id: "metric-widget-1",
        component: {
          kind: "metric-widget",
          entityName: "transaction",
          widgetId: "widget-1",
          styles: [{ property: "flex", value: "0" }],
        },
      },
      isStructuralRow: false,
      preferFlexGrow: false,
      preferContentWidth: true,
    });

    expect(classes.shell).toContain("w-fit");
    expect(classes.shell).toContain("basis-auto");
    expect(classes.shell).not.toContain("flex-[1_1_0]");
  });

  it("resolves parent stack direction and alignment for containers", () => {
    const layout = {
      showActions: true,
      root: {
        type: "root" as const,
        id: "root-1",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "component" as const,
                id: "container-1",
                component: {
                  kind: "container" as const,
                  stackDirection: "row" as const,
                  styles: [
                    { property: "alignItems" as const, value: "center" },
                  ],
                  rows: [
                    {
                      type: "component" as const,
                      id: "text-1",
                      component: {
                        kind: "text" as const,
                        primary: { type: "static" as const, value: "Hi" },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    expect(
      resolveParentStackDirection(layout, {
        scope: "container",
        columnIndex: 0,
        containerRowId: "container-1",
      }),
    ).toBe("row");

    expect(
      resolveParentStackAlign(layout, {
        scope: "container",
        columnIndex: 0,
        containerRowId: "container-1",
      }),
    ).toBe("center");

    const gridLayout = {
      showActions: true,
      root: {
        type: "root" as const,
        id: "root-1",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "component" as const,
                id: "row-greetings-header",
                component: {
                  kind: "grid" as const,
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center" as const,
                  rows: [
                    {
                      type: "component" as const,
                      id: "row-greetings-actions",
                      component: {
                        kind: "container" as const,
                        stackDirection: "row" as const,
                        rows: [],
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    expect(
      resolveParentIsGrid(gridLayout, {
        scope: "container",
        columnIndex: 0,
        containerRowId: "row-greetings-header",
      }),
    ).toBe(true);

    expect(
      resolveParentGridAlignItems(gridLayout, {
        scope: "container",
        columnIndex: 0,
        containerRowId: "row-greetings-header",
      }),
    ).toBe("center");

    expect(
      rowPrefersFlexGrow({
        type: "component",
        id: "row-flex",
        component: {
          kind: "text",
          primary: { type: "static", value: "Hello" },
          styles: [{ property: "flex", value: "1" }],
        },
      }),
    ).toBe(true);

    expect(
      rowUsesContentWidth({
        type: "component",
        id: "row-text",
        component: {
          kind: "text",
          primary: { type: "static", value: "Hello" },
          styles: [{ property: "fontWeight", value: "bold" }],
        },
      }),
    ).toBe(true);

    expect(
      rowUsesContentWidth({
        type: "component",
        id: "row-fit",
        component: {
          kind: "text",
          primary: { type: "static", value: "Hello" },
          styles: [{ property: "flex", value: "0" }],
        },
      }),
    ).toBe(true);
  });
});
