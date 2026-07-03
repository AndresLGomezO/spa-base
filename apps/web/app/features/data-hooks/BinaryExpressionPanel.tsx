import { useTranslation } from "react-i18next";
import type { ExpressionNode } from "@repo/hooks";
import { FieldLabel } from "@repo/ui";

import type {
  ExpressionEditorNodeRenderer,
  LoadedBinding,
} from "./expression-editor-node-types";
import {
  binaryOperatorLabelKey,
  listBinaryOperators,
} from "./expression-editor-utils";
import {
  expressionBinaryOperandClassName,
  expressionBinaryRowClassName,
} from "./expression-editor-shared";
import { useExpressionEditorReadOnly } from "./expression-editor-read-only-context";
import { ExpressionOperatorSelect } from "./ExpressionOperatorSelect";

interface BinaryExpressionPanelProps {
  readonly value: Extract<ExpressionNode, { kind: "binary" }>;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly renderNode: ExpressionEditorNodeRenderer;
}

export function BinaryExpressionPanel({
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  renderNode,
}: BinaryExpressionPanelProps) {
  const { t } = useTranslation("common");
  const readOnly = useExpressionEditorReadOnly();
  const operators = listBinaryOperators();

  return (
    <div className={expressionBinaryRowClassName}>
      <div className={expressionBinaryOperandClassName}>
        {renderNode({
          label: t("dataHooks.expression.leftOperand"),
          value: value.left,
          onChange: (left) => onChange({ ...value, left }),
          fieldNames,
          loadedBindings,
          aggregateBindings,
        })}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 sm:pt-6">
        <FieldLabel className="sr-only">
          {t("dataHooks.expression.operator")}
        </FieldLabel>
        <ExpressionOperatorSelect
          value={value.op}
          options={operators}
          disabled={readOnly}
          ariaLabel={t("dataHooks.expression.operator")}
          getLabel={(op) => t(binaryOperatorLabelKey(op), { defaultValue: op })}
          onChange={(op) => onChange({ ...value, op })}
        />
      </div>
      <div className={expressionBinaryOperandClassName}>
        {renderNode({
          label: t("dataHooks.expression.rightOperand"),
          value: value.right,
          onChange: (right) => onChange({ ...value, right }),
          fieldNames,
          loadedBindings,
          aggregateBindings,
        })}
      </div>
    </div>
  );
}
