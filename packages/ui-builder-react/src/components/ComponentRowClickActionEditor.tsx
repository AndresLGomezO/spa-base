import type { SerializableEntityDefinition } from "@repo/entities";
import type { ComponentClickAction } from "@repo/ui-builder-core";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";
import {
  ComponentClickActionEditor,
  type CatalogEntityOption,
  type ComponentClickActionEditorLabels,
} from "./ComponentClickActionEditor.js";

export interface ComponentRowClickActionEditorProps {
  readonly clickAction?: ComponentClickAction;
  readonly boundFieldPath?: string;
  readonly showCurrentRecordTarget?: boolean;
  readonly showRecordTargets?: boolean;
  readonly showListTargets?: boolean;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly definition: SerializableEntityDefinition;
  readonly catalogEntities?: readonly CatalogEntityOption[];
  readonly suggestedListEntityName?: string;
  readonly onChange: (clickAction: ComponentClickAction | undefined) => void;
  readonly labels: ComponentClickActionEditorLabels;
}

export function ComponentRowClickActionEditor({
  clickAction,
  boundFieldPath,
  showCurrentRecordTarget,
  showRecordTargets,
  showListTargets,
  fieldDescriptors,
  definition,
  catalogEntities,
  suggestedListEntityName,
  onChange,
  labels,
}: ComponentRowClickActionEditorProps) {
  return (
    <CollapsibleEditorCard title={labels.title}>
      <ComponentClickActionEditor
        clickAction={clickAction}
        boundFieldPath={boundFieldPath}
        showCurrentRecordTarget={showCurrentRecordTarget}
        showRecordTargets={showRecordTargets}
        showListTargets={showListTargets}
        fieldDescriptors={fieldDescriptors}
        definition={definition}
        catalogEntities={catalogEntities}
        suggestedListEntityName={suggestedListEntityName}
        onChange={onChange}
        labels={labels}
      />
    </CollapsibleEditorCard>
  );
}
