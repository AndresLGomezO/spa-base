import type { ExpressionNode } from "@repo/hooks";

import { ExpressionEditorNode } from "./ExpressionEditorNode";
import { ExpressionPreview } from "./ExpressionPreview";
import { ExpressionEditorReadOnlyProvider } from "./expression-editor-read-only-context";

import type { LoadedBinding } from "./expression-editor-node-types";

interface ExpressionEditorProps {
  readonly value: ExpressionNode;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly label?: string;
  readonly showPreview?: boolean;
  readonly collapsibleNested?: boolean;
  readonly readOnly?: boolean;
}

export function ExpressionEditor({
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  label,
  showPreview = true,
  collapsibleNested = false,
  readOnly = false,
}: ExpressionEditorProps) {
  return (
    <div className={`space-y-3${readOnly ? " opacity-90" : ""}`}>
      <ExpressionEditorReadOnlyProvider readOnly={readOnly}>
        <ExpressionEditorNode
          value={value}
          onChange={onChange}
          fieldNames={fieldNames}
          loadedBindings={loadedBindings}
          aggregateBindings={aggregateBindings}
          label={label}
          depth={0}
          collapsibleNested={collapsibleNested}
        />
      </ExpressionEditorReadOnlyProvider>
      {showPreview ? <ExpressionPreview value={value} /> : null}
    </div>
  );
}
