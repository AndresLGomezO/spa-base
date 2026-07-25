import { describe, expect, it } from "vitest";

import { expandNarrativeCharts } from "./expand-narrative-charts.js";

describe("expandNarrativeCharts", () => {
  it("expands chart placeholders into fenced blocks and drops charts", () => {
    const result = expandNarrativeCharts({
      text: "Intro\n\n{{chart:0}}\n\nOutro",
      charts: [
        {
          id: 0,
          kind: "progress",
          label: "Avance",
          percent: 62,
          caption: "80 de 240",
        },
      ],
    });

    expect(result.charts).toBeUndefined();
    expect(String(result.text)).toContain("```chart-progress");
    expect(String(result.text)).toContain('"percent":62');
    expect(String(result.text)).not.toContain("{{chart:0}}");
  });

  it("forces block boundaries when placeholders sit mid-paragraph", () => {
    const result = expandNarrativeCharts({
      text: "Before chart. {{chart:0}} After chart.",
      charts: [
        {
          id: 0,
          kind: "bar",
          title: "Mix",
          segments: [{ label: "A", value: 1 }],
        },
      ],
    });

    const text = String(result.text);
    expect(text).toMatch(/Before chart\.\n\n```chart-bar\n/);
    expect(text).toMatch(/\n```\n\nAfter chart\./);
  });

  it("supports pie/bar kinds and index fallback when id omitted", () => {
    const result = expandNarrativeCharts({
      text: "{{chart:0}}\n{{chart:1}}",
      charts: [
        {
          kind: "pie",
          title: "Cuota",
          slices: [
            { label: "Interés", value: 70 },
            { label: "Capital", value: 30 },
          ],
        },
        {
          kind: "chart-bar",
          title: "Mix",
          segments: [{ label: "A", value: 1 }],
        },
      ],
    });

    expect(String(result.text)).toContain("```chart-pie");
    expect(String(result.text)).toContain("```chart-bar");
  });

  it("leaves legacy text-only results unchanged", () => {
    const input = { text: '```chart-progress\n{"percent":10}\n```' };
    expect(expandNarrativeCharts(input)).toEqual(input);
  });

  it("strips unresolved placeholders", () => {
    const result = expandNarrativeCharts({
      text: "A {{chart:9}} B",
      charts: [{ id: 0, kind: "progress", percent: 1 }],
    });
    expect(String(result.text)).toBe("A\n\nB");
  });
});
