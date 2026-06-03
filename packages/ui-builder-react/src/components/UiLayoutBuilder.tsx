import type { ReactNode } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";

import type { ComponentConfigEditorProps } from "./ComponentConfigEditor.js";
import { LayoutPreview } from "./LayoutPreview.js";
import { Text } from "@repo/ui";
import {
  UiLayoutStructurePanel,
  type UiLayoutStructurePanelLabels,
} from "./UiLayoutStructurePanel.js";

export interface UiLayoutBuilderLabels extends UiLayoutStructurePanelLabels {
  readonly preview: string;
  readonly cardsPerRow: string;
}

export interface UiLayoutBuilderProps {
  readonly layout: UiLayoutDocument;
  readonly definition: SerializableEntityDefinition;
  readonly defaultFieldPath: string;
  readonly onLayoutChange: (layout: UiLayoutDocument) => void;
  readonly previewContext: LayoutRenderContext;
  readonly labels: UiLayoutBuilderLabels;
  readonly className?: string;
  readonly metricKpiEditor?: ComponentConfigEditorProps["metricKpiEditor"];
  readonly staticImageEditor?: ComponentConfigEditorProps["staticImageEditor"];
  readonly previewActions?: ReactNode;
}

export function UiLayoutBuilder({
  layout,
  definition,
  defaultFieldPath,
  onLayoutChange,
  previewContext,
  labels,
  className,
  metricKpiEditor,
  previewActions,
}: UiLayoutBuilderProps) {
  return (
    <div className={className ?? "flex min-h-0 flex-1 gap-4 overflow-hidden"}>
      <UiLayoutStructurePanel
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
        layout={layout}
        definition={definition}
        defaultFieldPath={defaultFieldPath}
        onLayoutChange={onLayoutChange}
        labels={labels}
        metricKpiEditor={metricKpiEditor}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto">
        <Text className="font-medium">{labels.preview}</Text>
        <LayoutPreview
          layout={layout}
          context={previewContext}
          actions={previewActions}
        />
      </div>
    </div>
  );
}

export {
  UiLayoutStructurePanel,
  type UiLayoutStructurePanelLabels,
  type UiLayoutStructurePanelProps,
} from "./UiLayoutStructurePanel.js";
export type { FieldDescriptor } from "./UiLayoutStructurePanel.js";
