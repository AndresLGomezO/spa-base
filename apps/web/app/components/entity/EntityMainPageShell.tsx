import type { ReactNode } from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  ensureStandardRoot,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";

interface EntityMainPageShellProps {
  readonly layout: UiLayoutDocument;
  readonly context: LayoutRenderContext;
  readonly fallback?: ReactNode;
}

/**
 * Shared main-page layout runtime for entity and custom view pages (Section 15.9).
 */
export function EntityMainPageShell({
  layout,
  context,
  fallback = null,
}: EntityMainPageShellProps) {
  if (!layout) {
    return fallback;
  }

  const normalized = ensureStandardRoot("screen", layout);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <RecursiveLayoutRenderer layout={normalized} context={context} />
    </div>
  );
}
