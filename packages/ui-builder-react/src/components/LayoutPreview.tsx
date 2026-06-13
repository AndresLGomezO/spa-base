import type { ReactNode } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import {
  RecursiveLayoutRenderer,
  type LayoutRenderContext,
  type NestedColumnWrapper,
  type RootColumnWrapper,
  type RowWrapper,
} from "@repo/ui-builder-renderer";
import { LayoutCard } from "@repo/ui";

export interface LayoutPreviewProps {
  readonly layout: UiLayoutDocument;
  readonly context: LayoutRenderContext;
  readonly actions?: ReactNode;
  readonly rowWrapper?: RowWrapper;
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
}

export function LayoutPreview({
  layout,
  context,
  actions,
  rowWrapper,
  rootColumnWrapper,
  nestedColumnWrapper,
}: LayoutPreviewProps) {
  return (
    <LayoutCard actions={actions}>
      <RecursiveLayoutRenderer
        layout={layout}
        context={context}
        rowWrapper={rowWrapper}
        rootColumnWrapper={rootColumnWrapper}
        nestedColumnWrapper={nestedColumnWrapper}
      />
    </LayoutCard>
  );
}
