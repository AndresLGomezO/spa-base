import { describe, expect, it } from "vitest";

import {
  resolveParentStackAlign,
  resolveParentStackDirection,
  resolvePreviewRowChromeLayoutClasses,
  rowPrefersFlexGrow,
  rowUsesContentWidth,
} from "./preview-row-chrome-layout";

describe("preview-row-chrome-layout", () => {
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

    expect(containerClasses.shell).toContain("flex-[1_1_0]");
    expect(textClasses.shell).toContain("shrink-0");
    expect(textClasses.shell).not.toContain("w-fit");
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
    ).toBe(false);

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
