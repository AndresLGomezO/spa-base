/** @vitest-environment jsdom */

import type { UiLayoutDocument } from "@repo/ui-builder-core";
import {
  createDefaultLayoutDocument,
  createDefaultWizardShellLayout,
} from "@repo/ui-builder-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LayoutRenderContext } from "../context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

const previewContext: LayoutRenderContext = {
  mode: "mainPage",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

const runtimeContext: LayoutRenderContext = {
  mode: "mainPage",
  data: {},
  locale: "en",
  resolveField: () => undefined,
};

function renderLayoutMarkup(
  layout: UiLayoutDocument,
  context: LayoutRenderContext,
): string {
  return renderToStaticMarkup(
    <RecursiveLayoutRenderer layout={layout} context={context} />,
  );
}

/**
 * Parity harness: preview and runtime modes must produce identical markup
 * when using the same render context (no preview-only style overrides).
 */
export function assertPreviewRuntimeParity(
  layout: UiLayoutDocument,
  previewCtx: LayoutRenderContext = previewContext,
  runtimeCtx: LayoutRenderContext = runtimeContext,
): void {
  const previewMarkup = renderLayoutMarkup(layout, previewCtx);
  const runtimeMarkup = renderLayoutMarkup(layout, runtimeCtx);
  expect(runtimeMarkup).toBe(previewMarkup);
}

describe("preview-runtime parity harness", () => {
  it("produces identical markup for default screen layout", () => {
    const layout = createDefaultLayoutDocument("screen");
    assertPreviewRuntimeParity(layout, previewContext, previewContext);
  });

  it("produces identical markup for component scope layout", () => {
    const layout = createDefaultLayoutDocument("component");
    const context: LayoutRenderContext = {
      mode: "listItem",
      data: {},
      locale: "en",
      resolveField: () => undefined,
    };
    assertPreviewRuntimeParity(layout, context, context);
  });

  it("produces identical markup for migrated wizard shell grid layout", () => {
    const layout = createDefaultWizardShellLayout();
    const context: LayoutRenderContext = {
      mode: "form",
      data: {},
      locale: "en",
      resolveField: () => undefined,
      wizard: {
        steps: [{ id: "step-1", label: "Step 1" }],
        currentStepIndex: 0,
        stepStatuses: { "step-1": "active" },
      },
    };
    assertPreviewRuntimeParity(layout, context, context);
  });
});
