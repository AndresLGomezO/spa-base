import { StructureItemNameEditor } from "@repo/ui-builder-react";
import type { FieldDescriptor } from "@repo/ui-builder-react";
import type { ColumnNode, RowNode } from "@repo/ui-builder-core";

import {
  resolveDefaultColumnNodeLabel,
  resolveDefaultRowNodeLabelForEditor,
  type StructureTreeLabels,
} from "./form-designer-structure-tree";
import { useStructureItemNameEditorLabels } from "./use-structure-item-name-editor-labels";

interface StructureRowNameFieldProps {
  readonly row: RowNode;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly treeLabels: StructureTreeLabels;
  readonly onChange: (name: string | undefined) => void;
  readonly id?: string;
  readonly className?: string;
}

export function StructureRowNameField({
  row,
  fieldDescriptors,
  treeLabels,
  onChange,
  id,
  className,
}: StructureRowNameFieldProps) {
  const defaultName = resolveDefaultRowNodeLabelForEditor(
    row,
    fieldDescriptors,
    treeLabels,
  );
  const labels = useStructureItemNameEditorLabels(defaultName);

  return (
    <StructureItemNameEditor
      id={id}
      name={row.name}
      defaultName={defaultName}
      labels={labels}
      onChange={onChange}
      className={className}
    />
  );
}

interface StructureColumnNameFieldProps {
  readonly column: ColumnNode;
  readonly columnIndex: number;
  readonly nestedColumnIndex?: number;
  readonly treeLabels: StructureTreeLabels;
  readonly onChange: (name: string | undefined) => void;
  readonly id?: string;
}

export function StructureColumnNameField({
  column,
  columnIndex,
  nestedColumnIndex,
  treeLabels,
  onChange,
  id,
}: StructureColumnNameFieldProps) {
  const defaultName = resolveDefaultColumnNodeLabel(
    columnIndex,
    treeLabels,
    nestedColumnIndex,
  );
  const labels = useStructureItemNameEditorLabels(defaultName);

  return (
    <StructureItemNameEditor
      id={id}
      name={column.name}
      defaultName={defaultName}
      labels={labels}
      onChange={onChange}
    />
  );
}
