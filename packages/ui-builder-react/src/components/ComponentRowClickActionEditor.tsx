import type { SerializableEntityDefinition } from "@repo/entities";
import type { ComponentClickAction } from "@repo/ui-builder-core";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";
import {
  ComponentClickActionEditor,
  type ComponentClickActionEditorLabels,
} from "./ComponentClickActionEditor.js";

export interface ComponentRowClickActionEditorProps {
  readonly clickAction?: ComponentClickAction;
  readonly boundFieldPath?: string;
  readonly showCurrentRecordTarget: boolean;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly definition: SerializableEntityDefinition;
  readonly onChange: (clickAction: ComponentClickAction | undefined) => void;
  readonly labels: ComponentClickActionEditorLabels;
}

export function ComponentRowClickActionEditor({
  clickAction,
  boundFieldPath,
  showCurrentRecordTarget,
  fieldDescriptors,
  definition,
  onChange,
  labels,
}: ComponentRowClickActionEditorProps) {
  return (
    <CollapsibleEditorCard title={labels.title}>
      <ComponentClickActionEditor
        clickAction={clickAction}
        boundFieldPath={boundFieldPath}
        showCurrentRecordTarget={showCurrentRecordTarget}
        fieldDescriptors={fieldDescriptors}
        definition={definition}
        onChange={onChange}
        labels={labels}
      />
    </CollapsibleEditorCard>
  );
}
