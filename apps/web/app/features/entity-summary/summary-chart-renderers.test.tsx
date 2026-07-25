/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { summaryChartBlockRenderers } from "./summary-chart-renderers";

vi.mock("@visx/responsive", () => ({
  ParentSize: ({
    children,
  }: {
    readonly children: (size: {
      readonly width: number;
      readonly height: number;
    }) => unknown;
  }) => children({ width: 280, height: 120 }),
}));

describe("summaryChartBlockRenderers", () => {
  it("renders chart-progress for valid payload", () => {
    const node = summaryChartBlockRenderers["chart-progress"]!(
      JSON.stringify({
        label: "Avance del crédito",
        percent: 62,
        caption: "80 de 240 cuotas",
      }),
    );
    render(<>{node}</>);
    expect(screen.getByText("Avance del crédito")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("returns null for invalid chart-progress JSON", () => {
    expect(
      summaryChartBlockRenderers["chart-progress"]!("not-json"),
    ).toBeNull();
    expect(
      summaryChartBlockRenderers["chart-progress"]!(
        JSON.stringify({ label: "x" }),
      ),
    ).toBeNull();
  });

  it("renders chart-pie for valid slices", () => {
    const node = summaryChartBlockRenderers["chart-pie"]!(
      JSON.stringify({
        title: "Cómo se reparte la cuota",
        slices: [
          { label: "Interés", value: 70 },
          { label: "Capital", value: 30 },
        ],
      }),
    );
    expect(node).not.toBeNull();
    const html = renderToStaticMarkup(<>{node}</>);
    expect(html).toContain("Cómo se reparte la cuota");
    expect(html).toContain("Interés");
  });

  it("returns null for empty or invalid chart-pie", () => {
    expect(
      summaryChartBlockRenderers["chart-pie"]!(
        JSON.stringify({ title: "x", slices: [] }),
      ),
    ).toBeNull();
    expect(
      summaryChartBlockRenderers["chart-pie"]!(
        JSON.stringify({ title: "x", slices: [{ label: "A", value: 0 }] }),
      ),
    ).toBeNull();
  });

  it("renders chart-bar for valid segments", () => {
    const node = summaryChartBlockRenderers["chart-bar"]!(
      JSON.stringify({
        title: "Interés vs capital",
        segments: [
          { label: "Interés", value: 70 },
          { label: "Capital", value: 30 },
        ],
      }),
    );
    render(<>{node}</>);
    expect(screen.getByText("Interés vs capital")).toBeInTheDocument();
    expect(screen.getByText(/Capital/)).toBeInTheDocument();
  });

  it("returns null for wrong chart-bar schema", () => {
    expect(
      summaryChartBlockRenderers["chart-bar"]!(
        JSON.stringify({ title: "x", slices: [{ label: "A", value: 1 }] }),
      ),
    ).toBeNull();
  });

  it("renders chart-sparkline for at least two points", () => {
    const node = summaryChartBlockRenderers["chart-sparkline"]!(
      JSON.stringify({
        title: "Saldo restante",
        points: [100, 90, 80],
      }),
    );
    expect(node).not.toBeNull();
    const html = renderToStaticMarkup(<>{node}</>);
    expect(html).toContain("Saldo restante");
  });

  it("returns null for chart-sparkline with fewer than two points", () => {
    expect(
      summaryChartBlockRenderers["chart-sparkline"]!(
        JSON.stringify({ title: "x", points: [1] }),
      ),
    ).toBeNull();
  });
});
