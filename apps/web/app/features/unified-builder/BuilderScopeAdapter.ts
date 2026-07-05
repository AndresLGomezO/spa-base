import type { ReactNode } from "react";
import type {
  CompositionScope,
  DesignSurface,
  PreviewContextConfig,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import { createPreviewContextConfig } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";

/** Scope adapter: bridges route-specific persistence/render to the composition engine (Section 15.12). */
export interface BuilderScopeAdapter {
  readonly scope: CompositionScope;
  readonly designSurface: DesignSurface;
  readonly layout: UiLayoutDocument;
  readonly setLayout: (layout: UiLayoutDocument) => void;
  readonly previewContext: PreviewContextConfig;
  readonly createRenderContext: () => LayoutRenderContext;
  readonly treePanel: ReactNode;
  readonly previewPanel: ReactNode;
  readonly propertiesPanel?: ReactNode;
}

export function createBuilderScopeAdapter(
  input: Omit<BuilderScopeAdapter, "previewContext"> & {
    readonly previewContext?: PreviewContextConfig;
  },
): BuilderScopeAdapter {
  return {
    ...input,
    previewContext:
      input.previewContext ??
      createPreviewContextConfig(input.scope, input.designSurface),
  };
}
