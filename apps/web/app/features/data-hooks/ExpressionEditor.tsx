import type { ExpressionNode } from "@repo/hooks";

import { ExpressionEditorNode } from "./ExpressionEditorNode";
import { ExpressionPreview } from "./ExpressionPreview";

import type { LoadedBinding } from "./expression-editor-node-types";

interface ExpressionEditorProps {
  readonly value: ExpressionNode;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly label?: string;
  readonly showPreview?: boolean;
}

export function ExpressionEditor({
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  label,
  showPreview = true,
}: ExpressionEditorProps) {
  return (
    <div className="space-y-3">
      <ExpressionEditorNode
        value={value}
        onChange={onChange}
        fieldNames={fieldNames}
        loadedBindings={loadedBindings}
        aggregateBindings={aggregateBindings}
        label={label}
      />
      {showPreview ? <ExpressionPreview value={value} /> : null}
    </div>
  );
}
