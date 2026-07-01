import type { ReactNode } from "react";
import type { ExpressionNode } from "@repo/hooks";

export interface ExpressionEditorNodeProps {
  readonly value: ExpressionNode;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly label?: string;
}

export type ExpressionEditorNodeRenderer = (
  props: ExpressionEditorNodeProps,
) => ReactNode;
