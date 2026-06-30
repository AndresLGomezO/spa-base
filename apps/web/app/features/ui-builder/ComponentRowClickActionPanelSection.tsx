import type { SerializableEntityDefinition } from "@repo/entities";
import {
  resolveComponentBoundFieldPath,
  type DesignSurface,
} from "@repo/ui-builder-core";
import { ComponentRowClickActionEditor } from "@repo/ui-builder-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { FieldDescriptor } from "@repo/ui-builder-react";

import { componentClickActionEditorLabels } from "./component-click-action-editor-labels.js";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref.js";
import type { ComponentsLayoutBinding } from "../form-designer/form-designer-components-layout.js";
import type { ComponentRowNode } from "@repo/ui-builder-core";

const LIST_LIKE_SURFACES = new Set<DesignSurface>([
  "listItem",
  "tableColumnCell",
  "tableRowExpand",
  "metricStrip",
  "metricRow",
  "metricWidget",
  "dashboardSection",
  "dashboardLayout",
  "mainPage",
]);

function showsCurrentRecordClickTarget(surface: DesignSurface): boolean {
  return LIST_LIKE_SURFACES.has(surface);
}

interface ComponentRowClickActionPanelSectionProps {
  readonly row: ComponentRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly definition: SerializableEntityDefinition;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly designSurface: DesignSurface;
}

export function ComponentRowClickActionPanelSection({
  row,
  rowRef,
  binding,
  definition,
  fieldDescriptors,
  designSurface,
}: ComponentRowClickActionPanelSectionProps) {
  const { t } = useTranslation("common");
  const labels = useMemo(() => componentClickActionEditorLabels(t), [t]);

  return (
    <ComponentRowClickActionEditor
      clickAction={row.clickAction}
      boundFieldPath={resolveComponentBoundFieldPath(row.component)}
      showCurrentRecordTarget={showsCurrentRecordClickTarget(designSurface)}
      fieldDescriptors={fieldDescriptors}
      definition={definition}
      onChange={(clickAction) => binding.updateRowMeta(rowRef, { clickAction })}
      labels={labels}
    />
  );
}
