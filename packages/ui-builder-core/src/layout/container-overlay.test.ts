import { describe, expect, it } from "vitest";

import {
  containerEstablishesDefiniteHeight,
  containerHasFixedExplicitHeight,
  containerHasPixelMinHeight,
  containerUsesPercentFillHeight,
  containerUsesPercentHeight,
  containerUsesPercentSplitHeight,
  layoutEstablishesDefiniteHeight,
  resolveContainerPercentSplitFlexStyle,
  resolveContainerShellLayoutStyle,
  resolveContainerShellOverlayStyle,
  resolvePercentSplitSiblingContainerClass,
  resolveChartComponentRowStyles,
  isOverlayImageRow,
} from "@repo/ui-builder-core";
import type { ChartComponentConfig } from "../types/component.js";
import type { ComponentRowNode } from "../types/layout.js";

describe("container height style helpers", () => {
  it("detects percentage heights", () => {
    expect(
      containerUsesPercentHeight([{ property: "height", value: "100%" }]),
    ).toBe(true);
    expect(
      containerUsesPercentHeight([{ property: "height", value: "200" }]),
    ).toBe(false);
  });

  it("treats fixed and percentage heights differently", () => {
    expect(
      containerHasFixedExplicitHeight([{ property: "height", value: "200" }]),
    ).toBe(true);
    expect(
      containerHasFixedExplicitHeight([{ property: "height", value: "100%" }]),
    ).toBe(false);
    expect(
      containerHasFixedExplicitHeight([
        { property: "minHeight", value: "100%" },
      ]),
    ).toBe(false);
  });

  it("detects fill and split percentage heights", () => {
    expect(
      containerUsesPercentFillHeight([
        { property: "minHeight", value: "100%" },
      ]),
    ).toBe(true);
    expect(
      containerUsesPercentSplitHeight([
        { property: "minHeight", value: "60%" },
      ]),
    ).toBe(true);
    expect(
      containerUsesPercentSplitHeight([{ property: "height", value: "100%" }]),
    ).toBe(false);
  });

  it("omits deferred padding from shell inline so responsive cssText can win", () => {
    expect(
      resolveContainerShellLayoutStyle(
        [
          {
            property: "padding",
            value: "24",
            valuesByBreakpoint: { md: "8" },
          },
          { property: "marginTop", value: "4" },
        ],
        [],
      ),
    ).toEqual({
      marginTop: "4px",
    });

    expect(
      resolveContainerShellLayoutStyle(
        [
          {
            property: "padding",
            value: "24",
            valuesByBreakpoint: { md: "8" },
          },
        ],
        [],
        { atBreakpoint: "base" },
      ),
    ).toEqual({
      padding: "8px",
    });
  });

  it("does not treat minHeight 0 as a definite pixel height", () => {
    expect(
      containerEstablishesDefiniteHeight([
        { property: "minHeight", value: "0" },
      ]),
    ).toBe(false);
    expect(
      containerHasPixelMinHeight([{ property: "minHeight", value: "0" }]),
    ).toBe(false);
    expect(
      resolveContainerShellLayoutStyle(
        [
          { property: "flex", value: "1" },
          { property: "minHeight", value: "0" },
          { property: "overflowY", value: "auto" },
        ],
        [],
      ),
    ).toEqual({
      minHeight: "0px",
    });
  });

  it("returns flex-basis split style for percentage split heights", () => {
    expect(
      resolveContainerPercentSplitFlexStyle([
        { property: "height", value: "60%" },
      ]),
    ).toEqual({
      flex: "0 0 60%",
      minHeight: "0",
    });
  });

  it("omits conflicting percentage height when applying flex split", () => {
    expect(
      resolveContainerShellLayoutStyle(
        [
          { property: "height", value: "60%" },
          { property: "backgroundColor", value: "#000000" },
        ],
        [],
        { parentStackDirection: "column" },
      ),
    ).toEqual({
      flex: "0 0 60%",
      minHeight: "0",
      backgroundColor: "#000000",
    });
  });

  it("uses fill height on container shell when flex split is deferred to row chrome", () => {
    expect(
      resolveContainerShellLayoutStyle(
        [{ property: "height", value: "60%" }],
        [],
        {
          parentStackDirection: "column",
          applyPercentSplitFlex: false,
        },
      ),
    ).toEqual({
      height: "100%",
    });
  });

  it("detects definite height on layout root containers", () => {
    expect(
      layoutEstablishesDefiniteHeight({
        showActions: true,
        root: {
          type: "root",
          id: "root",
          columnCount: 1,
          columns: [
            {
              id: "col",
              rows: [
                {
                  type: "component",
                  id: "row-container",
                  component: {
                    kind: "container",
                    styles: [{ property: "minHeight", value: "200" }],
                    rows: [],
                  },
                },
              ],
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it("resolves flex-1 class for non-split siblings in percent-split stacks", () => {
    expect(
      resolvePercentSplitSiblingContainerClass(
        {
          type: "component",
          id: "row-first",
          component: { kind: "container", rows: [] },
        },
        "column",
        [
          {
            type: "component",
            id: "row-first",
            component: { kind: "container", rows: [] },
          },
          {
            type: "component",
            id: "row-third",
            component: {
              kind: "container",
              styles: [{ property: "height", value: "30%" }],
              rows: [],
            },
          },
        ],
      ),
    ).toBe("flex min-h-0 flex-1 w-full min-w-0 flex-col");

    expect(
      resolvePercentSplitSiblingContainerClass(
        {
          type: "component",
          id: "row-third",
          component: {
            kind: "container",
            styles: [{ property: "height", value: "30%" }],
            rows: [],
          },
        },
        "column",
        [
          {
            type: "component",
            id: "row-first",
            component: { kind: "container", rows: [] },
          },
          {
            type: "component",
            id: "row-third",
            component: {
              kind: "container",
              styles: [{ property: "height", value: "30%" }],
              rows: [],
            },
          },
        ],
      ),
    ).toBeUndefined();
  });

  it("detects overlay chart rows and applies overlay row styles", () => {
    const chartComponent = {
      kind: "chart",
      chartDefinitionId: "Income trend chart",
      styles: [
        { property: "pointerEvents", value: "none" },
        { property: "top", value: "50%" },
      ],
    } satisfies ChartComponentConfig;
    const chartRow: ComponentRowNode = {
      type: "component",
      id: "row-income-chart",
      component: chartComponent,
    };

    expect(isOverlayImageRow(chartRow)).toBe(true);
    expect(resolveContainerShellOverlayStyle([], [chartRow]).position).toBe(
      "relative",
    );
    expect(
      resolveChartComponentRowStyles(chartComponent).some(
        (rule) => rule.property === "position" && rule.value === "absolute",
      ),
    ).toBe(true);
    expect(
      resolveChartComponentRowStyles({
        ...chartComponent,
        styles: [
          { property: "top", value: "auto" },
          { property: "pointerEvents", value: "none" },
        ],
      } satisfies ChartComponentConfig).some(
        (rule) => rule.property === "top" && rule.value === "0",
      ),
    ).toBe(true);
  });
});
