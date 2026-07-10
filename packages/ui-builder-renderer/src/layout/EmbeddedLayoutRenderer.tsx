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
  /** When false, embedded content renders without designer row/column chrome wrappers. */
  readonly inheritDesignerWrappers?: boolean;
}

export function EmbeddedLayoutRenderer({
  layout,
  context,
  shellClassName,
  shellStyle,
  inheritDesignerWrappers = true,
}: EmbeddedLayoutRendererProps): ReactNode {
  const inherited = useLayoutRenderOptions();

  return (
    <div className={shellClassName} style={shellStyle}>
      <RecursiveLayoutRenderer
        layout={layout}
        context={context}
        stretchRootColumns={
          inheritDesignerWrappers ? inherited.stretchRootColumns : false
        }
        rowWrapper={inheritDesignerWrappers ? inherited.rowWrapper : undefined}
        rootColumnWrapper={
          inheritDesignerWrappers ? inherited.rootColumnWrapper : undefined
        }
        nestedColumnWrapper={
          inheritDesignerWrappers ? inherited.nestedColumnWrapper : undefined
        }
        renderEmptyRootColumns={
          inheritDesignerWrappers ? inherited.renderEmptyRootColumns : false
        }
      />
    </div>
  );
}
