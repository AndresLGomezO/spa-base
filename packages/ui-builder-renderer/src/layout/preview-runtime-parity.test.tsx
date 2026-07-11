/** @vitest-environment jsdom */

import type { UiLayoutDocument } from "@repo/ui-builder-core";
import {
  createDefaultLayoutDocument,
  createDefaultWizardShellLayout,
  createScreenRootNode,
  toEditableLayoutDocument,
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
  options?: {
    readonly flattenScreenRoot?: boolean;
    readonly promotedContainerRowId?: string;
  },
): string {
  return renderToStaticMarkup(
    <RecursiveLayoutRenderer
      layout={layout}
      context={context}
      flattenScreenRoot={options?.flattenScreenRoot}
      promotedContainerRowId={options?.promotedContainerRowId}
    />,
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

/**
 * Floating footer fixture: row shell with absolute center FAB + sibling tabs.
 * Mirrors the production AppFooter flatten + promote path.
 */
function createFloatingFooterLayout(): UiLayoutDocument {
  const leftTab = {
    type: "component" as const,
    id: "tab-home",
    component: {
      kind: "text" as const,
      primary: { type: "static" as const, value: "Home" },
    },
  };
  const centerFab = {
    type: "component" as const,
    id: "fab-center",
    component: {
      kind: "container" as const,
      stackDirection: "column" as const,
      rows: [
        {
          type: "component" as const,
          id: "fab-icon",
          component: {
            kind: "text" as const,
            primary: { type: "static" as const, value: "Camera" },
          },
        },
      ],
      styles: [
        {
          property: "position" as const,
          value: "absolute",
        },
        {
          property: "top" as const,
          value: "-32px",
        },
        {
          property: "left" as const,
          value: "50%",
        },
      ],
    },
  };
  const rightTab = {
    type: "component" as const,
    id: "tab-profile",
    component: {
      kind: "text" as const,
      primary: { type: "static" as const, value: "Profile" },
    },
  };
  const shell = {
    type: "component" as const,
    id: "app-footer-shell",
    component: {
      kind: "container" as const,
      stackDirection: "row" as const,
      rows: [leftTab, centerFab, rightTab],
    },
  };

  return {
    root: createScreenRootNode([shell], { gridTemplateColumns: "1fr" }),
    showActions: false,
  };
}

function createLegacyTwoColumnLayout(): UiLayoutDocument {
  return {
    root: {
      type: "root",
      id: "root-legacy",
      columnCount: 2,
      columns: [
        {
          id: "col-0",
          rows: [
            {
              type: "component",
              id: "row-a",
              component: {
                kind: "text",
                primary: { type: "static", value: "A" },
              },
            },
          ],
        },
        {
          id: "col-1",
          rows: [
            {
              type: "component",
              id: "row-b",
              component: {
                kind: "text",
                primary: { type: "static", value: "B" },
              },
            },
          ],
        },
      ],
    },
    showActions: false,
  };
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

describe("app-shell footer flatten parity", () => {
  const chromeContext: LayoutRenderContext = {
    mode: "mainPage",
    data: {},
    locale: "en",
    resolveField: () => undefined,
  };

  it("flattens promoted shell children as direct siblings (no nested 1fr grid)", () => {
    const layout = createFloatingFooterLayout();
    const runtimeMarkup = renderLayoutMarkup(layout, chromeContext, {
      flattenScreenRoot: true,
      promotedContainerRowId: "app-footer-shell",
    });

    expect(runtimeMarkup).toContain('data-layout-row-id="tab-home"');
    expect(runtimeMarkup).toContain('data-layout-row-id="fab-center"');
    expect(runtimeMarkup).toContain('data-layout-row-id="tab-profile"');
    // Flatten skips screen-root grid shell — no single-column grid wrapper.
    expect(runtimeMarkup).not.toContain(
      "grid-template-columns:minmax(0, 100fr)",
    );
    expect(runtimeMarkup).not.toContain(
      "grid-template-columns: minmax(0, 100fr)",
    );
  });

  it("editable conversion breaks flatten and nests a 1fr grid (regression guard)", () => {
    const layout = createFloatingFooterLayout();
    const editable = toEditableLayoutDocument(layout);
    const brokenPreviewMarkup = renderLayoutMarkup(editable, chromeContext, {
      flattenScreenRoot: true,
      promotedContainerRowId: "app-footer-shell",
    });
    const runtimeMarkup = renderLayoutMarkup(layout, chromeContext, {
      flattenScreenRoot: true,
      promotedContainerRowId: "app-footer-shell",
    });

    expect(brokenPreviewMarkup).not.toBe(runtimeMarkup);
    // Legacy editable root wraps promoted children in a 1-col grid (the
    // Untitled-1 vs Untitled-2 footer regression).
    expect(brokenPreviewMarkup).toContain(
      "grid-template-columns:minmax(0, 100fr)",
    );
    expect(runtimeMarkup).not.toContain(
      "grid-template-columns:minmax(0, 100fr)",
    );
  });

  it("preserves absolute position styles on promoted FAB sibling", () => {
    const layout = createFloatingFooterLayout();
    const markup = renderLayoutMarkup(layout, chromeContext, {
      flattenScreenRoot: true,
      promotedContainerRowId: "app-footer-shell",
    });

    expect(markup).toMatch(/position:\s*absolute/);
    expect(markup).toMatch(/top:\s*-32px/);
    expect(markup).toMatch(/left:\s*50%/);
  });

  it("stamps data-layout-column-id on legacy column shells", () => {
    const layout = createLegacyTwoColumnLayout();
    const markup = renderLayoutMarkup(layout, chromeContext);
    expect(markup).toContain('data-layout-column-id="0"');
    expect(markup).toContain('data-layout-column-id="1"');
  });
});
