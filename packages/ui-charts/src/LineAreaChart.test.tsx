/** @vitest-environment jsdom */

import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LineAreaChart } from "./LineAreaChart.js";

vi.mock("@visx/responsive", () => ({
  ParentSize: ({
    children,
  }: {
    readonly children: (size: {
      readonly width: number;
      readonly height: number;
    }) => unknown;
  }) => children({ width: 320, height: 160 }),
}));

const sampleSeries = [
  {
    id: "default",
    label: "Income",
    color: "rgba(34, 197, 94, 0.95)",
    areaFillColor: "rgba(34, 197, 94, 1)",
    areaFillOpacity: 0.18,
    points: [
      { x: "1", y: 10 },
      { x: "2", y: 20 },
      { x: "3", y: 15 },
    ],
  },
] as const;

describe("LineAreaChart", () => {
  it("renders area fill gradient with per-instance id and currentColor stops", () => {
    const html = renderToStaticMarkup(
      <LineAreaChart chartType="area" series={sampleSeries} />,
    );

    expect(html).toContain('stop-color="currentColor"');
    expect(html).toContain('stop-opacity="0.18"');
    expect(html).toMatch(/chart-area-gradient-[^"]+-default/);
    expect(html).toContain('color="rgba(34, 197, 94, 1)"');
    expect(html).toContain('stroke="rgba(34, 197, 94, 0.95)"');
    expect(html).toContain('fill="url(#');
  });

  it("uses unique gradient ids across chart instances", () => {
    const html = renderToStaticMarkup(
      <Fragment>
        <LineAreaChart chartType="area" series={sampleSeries} />
        <LineAreaChart chartType="area" series={sampleSeries} />
      </Fragment>,
    );

    const ids = [...html.matchAll(/id="(chart-area-gradient-[^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
