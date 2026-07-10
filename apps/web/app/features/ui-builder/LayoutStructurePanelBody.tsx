import type { UiLayoutDocument } from "@repo/entities";
import { useMemo, type ReactNode } from "react";

import { StructurePanelComponentIdLabel } from "./StructurePanelComponentIdLabel";
import {
  resolveStructurePanelTargetId,
  type StructurePanelLayoutTarget,
} from "./resolve-structure-panel-target-id";

interface LayoutStructurePanelBodyProps {
  readonly layout: UiLayoutDocument;
  readonly target: StructurePanelLayoutTarget;
  readonly groupedColumnIds?: readonly { readonly id: string }[];
  readonly children: ReactNode;
}

export function LayoutStructurePanelBody({
  layout,
  target,
  groupedColumnIds,
  children,
}: LayoutStructurePanelBodyProps) {
  const componentId = useMemo(
    () =>
      resolveStructurePanelTargetId(layout, target, {
        groupedColumnIds,
      }),
    [groupedColumnIds, layout, target],
  );

  return (
    <div className="flex flex-col gap-3">
      {componentId ? <StructurePanelComponentIdLabel id={componentId} /> : null}
      {children}
    </div>
  );
}
