import type { CSSProperties, ReactNode } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { LayoutRenderContext } from "../context.js";
import { useLayoutRenderOptions } from "../layout-render-options-context.js";
import { RecursiveLayoutRenderer } from "./RecursiveLayoutRenderer.js";

export interface EmbeddedLayoutRendererProps {
  readonly layout: UiLayoutDocument;
  readonly context: LayoutRenderContext;
  readonly shellClassName?: string;
  readonly shellStyle?: CSSProperties;
}

export function EmbeddedLayoutRenderer({
  layout,
  context,
  shellClassName,
  shellStyle,
}: EmbeddedLayoutRendererProps): ReactNode {
  const inherited = useLayoutRenderOptions();

  return (
    <div className={shellClassName} style={shellStyle}>
      <RecursiveLayoutRenderer
        layout={layout}
        context={context}
        stretchRootColumns={inherited.stretchRootColumns}
        rowWrapper={inherited.rowWrapper}
        rootColumnWrapper={inherited.rootColumnWrapper}
        nestedColumnWrapper={inherited.nestedColumnWrapper}
        renderEmptyRootColumns={inherited.renderEmptyRootColumns}
      />
    </div>
  );
}
