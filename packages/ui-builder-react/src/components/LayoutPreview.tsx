import type { ReactNode } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import {
  RecursiveLayoutRenderer,
  type LayoutRenderContext,
} from "@repo/ui-builder-renderer";
import { LayoutCard } from "@repo/ui";

export interface LayoutPreviewProps {
  readonly layout: UiLayoutDocument;
  readonly context: LayoutRenderContext;
  readonly actions?: ReactNode;
}

export function LayoutPreview({
  layout,
  context,
  actions,
}: LayoutPreviewProps) {
  return (
    <LayoutCard actions={actions}>
      <RecursiveLayoutRenderer layout={layout} context={context} />
    </LayoutCard>
  );
}
