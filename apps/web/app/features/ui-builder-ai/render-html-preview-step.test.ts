import { describe, expect, it, vi } from "vitest";

import {
  applyRenderHtmlPreviewStepPanels,
  scrollRenderHtmlPreviewToTop,
} from "./render-html-preview-step";

function createWizardDocument(): Document {
  const doc = document.implementation.createHTMLDocument("preview");
  doc.body.innerHTML = `
    <div id="main-panels">
      <section id="step-1" class="step-panel">Step 1</section>
      <section id="step-2" class="step-panel">Step 2</section>
    </div>
    <nav class="wizard-nav">
      <a href="#step-1">One</a>
      <a href="#step-2">Two</a>
    </nav>
  `;
  return doc;
}

describe("applyRenderHtmlPreviewStepPanels", () => {
  it("shows the requested step and hides the others", () => {
    const doc = createWizardDocument();

    expect(applyRenderHtmlPreviewStepPanels(doc, "step-2")).toBe("step-2");

    expect(doc.querySelector<HTMLElement>("#step-1")?.style.display).toBe(
      "none",
    );
    expect(doc.querySelector<HTMLElement>("#step-2")?.style.display).toBe(
      "block",
    );
    expect(
      doc.querySelector('a[href="#step-2"]')?.classList.contains("active"),
    ).toBe(true);
  });

  it("falls back to the first step when the id is missing", () => {
    const doc = createWizardDocument();

    expect(applyRenderHtmlPreviewStepPanels(doc, "missing")).toBe("step-1");
    expect(doc.querySelector<HTMLElement>("#step-1")?.style.display).toBe(
      "block",
    );
  });

  it("returns null when the preview has no wizard panels", () => {
    const doc = document.implementation.createHTMLDocument("preview");
    doc.body.innerHTML = "<div>Plain preview</div>";

    expect(applyRenderHtmlPreviewStepPanels(doc, "step-1")).toBeNull();
  });
});

describe("scrollRenderHtmlPreviewToTop", () => {
  it("resets scroll on the iframe window and document roots", () => {
    const scrollTo = vi.fn();
    const iframe = {
      contentWindow: { scrollTo },
      contentDocument: {
        documentElement: { scrollTo: vi.fn() },
        body: { scrollTo: vi.fn() },
      },
    } as unknown as HTMLIFrameElement;

    scrollRenderHtmlPreviewToTop(iframe);

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(
      iframe.contentDocument!.documentElement.scrollTo,
    ).toHaveBeenCalledWith(0, 0);
    expect(iframe.contentDocument!.body.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
