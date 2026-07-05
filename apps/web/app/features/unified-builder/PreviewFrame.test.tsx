import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PreviewStrategy } from "@repo/ui-builder-core";

import { PreviewContextProvider } from "./PreviewContextProvider";
import { PreviewFrame } from "./PreviewFrame";

function renderWidthPreview() {
  const strategy: PreviewStrategy = {
    type: "width",
    min: 100,
    max: 600,
    default: 300,
    presets: [100, 200, 300, 400, 600],
  };

  return render(
    <PreviewContextProvider strategy={strategy}>
      <PreviewFrame>
        <div data-testid="preview-content">Widget</div>
      </PreviewFrame>
    </PreviewContextProvider>,
    {
      // PreviewContextProvider initializes from strategy.default (300)
    },
  );
}

describe("PreviewFrame width strategy", () => {
  it("sizes the preview shell to the slider width instead of a fixed breakpoint frame", () => {
    renderWidthPreview();

    const content = screen.getByTestId("preview-content");
    const widthShell = content.closest(
      '[style*="width: 300px"]',
    ) as HTMLElement | null;

    expect(widthShell).not.toBeNull();

    const framedViewport = content.closest(
      ".border-dashed",
    ) as HTMLElement | null;
    expect(framedViewport).not.toBeNull();
    expect(framedViewport?.style.width).toBe("");
    expect(framedViewport?.className).toContain("w-full");
  });
});
