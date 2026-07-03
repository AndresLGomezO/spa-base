import type { ReactNode } from "react";
import type { ExpressionNode } from "@repo/hooks";

import type { FormulaDefinitionRecord } from "../../lib/api-client";

export interface LoadedBinding {
  readonly alias: string;
  readonly entity: string;
}

export interface ExpressionEditorNodeProps {
  readonly value: ExpressionNode;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly formulaCatalog?: readonly FormulaDefinitionRecord[];
  readonly renderNestedNode?: ExpressionEditorNodeRenderer;
  readonly label?: string;
  readonly depth?: number;
  readonly collapsibleNested?: boolean;
}

export type ExpressionEditorNodeRenderer = (
  props: ExpressionEditorNodeProps,
) => ReactNode;
