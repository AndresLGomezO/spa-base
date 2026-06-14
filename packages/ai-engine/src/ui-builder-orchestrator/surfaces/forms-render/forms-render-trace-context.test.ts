import { describe, expect, it } from "vitest";

import {
  sanitizeRenderTraceContextBlocks,
  summarizePreviousHtmlForTrace,
} from "./forms-render-trace-context.js";

describe("sanitizeRenderTraceContextBlocks", () => {
  it("replaces previous HTML block with a summary for trace storage", () => {
    const html = `<!DOCTYPE html><html><body>${'<section class="step-panel">x</section>'.repeat(20)}<input name="name"></body></html>`;
    const [block] = sanitizeRenderTraceContextBlocks([
      { id: "entity.current", content: "fields" },
      { id: "step.previousHtmlDocument", content: html },
    ]);

    expect(block?.id).toBe("entity.current");
    expect(block?.content).toBe("fields");
    const summary = sanitizeRenderTraceContextBlocks([
      { id: "step.previousHtmlDocument", content: html },
    ])[0];
    expect(summary?.content).toContain("omitted from trace");
    expect(summary?.content).toContain(String(html.length));
    expect(summary?.content).not.toContain("<!DOCTYPE");
  });
});

describe("summarizePreviousHtmlForTrace", () => {
  it("includes size and structure hints", () => {
    const summary = summarizePreviousHtmlForTrace(
      '<section class="step-panel"></section><input name="a">',
    );
    expect(summary).toContain("step panels");
    expect(summary).toContain("named fields");
  });
});
