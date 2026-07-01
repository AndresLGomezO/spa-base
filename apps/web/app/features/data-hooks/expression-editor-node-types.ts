import type { ReactNode } from "react";
import type { ExpressionNode } from "@repo/hooks";

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
  readonly label?: string;
}

export type ExpressionEditorNodeRenderer = (
  props: ExpressionEditorNodeProps,
) => ReactNode;
