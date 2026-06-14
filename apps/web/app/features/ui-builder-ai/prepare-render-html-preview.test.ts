import { describe, expect, it } from "vitest";

import { prepareRenderHtmlPreview } from "./prepare-render-html-preview";

describe("prepareRenderHtmlPreview", () => {
  it("strips scripts and injects preview layout overrides", () => {
    const prepared = prepareRenderHtmlPreview(
      '<!DOCTYPE html><html><head></head><body><script src="/@vite/client"></script><a href="step-2">Next</a></body></html>',
    );
    expect(prepared).not.toContain("<script");
    expect(prepared).not.toContain("<base");
    expect(prepared).toContain("overflow:auto");
    expect(prepared).toContain(".wizard-nav a.active");
  });

  it("removes modulepreload links to the dev server", () => {
    const prepared = prepareRenderHtmlPreview(
      '<html><head><link rel="modulepreload" href="/@id/__x00__virtual:react-router/browser-manifest"></head><body></body></html>',
    );
    expect(prepared).not.toContain("modulepreload");
    expect(prepared).not.toContain("react-router");
  });
});
