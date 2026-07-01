import type { ExpressionNode } from "@repo/hooks";

import { ExpressionEditorNode } from "./ExpressionEditorNode";
import { ExpressionPreview } from "./ExpressionPreview";

interface ExpressionEditorProps {
  readonly value: ExpressionNode;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly label?: string;
  readonly showPreview?: boolean;
}

export function ExpressionEditor({
  value,
  onChange,
  fieldNames,
  label,
  showPreview = true,
}: ExpressionEditorProps) {
  return (
    <div className="space-y-3">
      <ExpressionEditorNode
        value={value}
        onChange={onChange}
        fieldNames={fieldNames}
        label={label}
      />
      {showPreview ? <ExpressionPreview value={value} /> : null}
    </div>
  );
}
