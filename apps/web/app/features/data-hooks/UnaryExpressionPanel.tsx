import { useTranslation } from "react-i18next";
import type { ExpressionNode } from "@repo/hooks";
import { FieldLabel } from "@repo/ui";

import type {
  ExpressionEditorNodeRenderer,
  LoadedBinding,
} from "./expression-editor-node-types";
import {
  listUnaryOperators,
  unaryOperatorLabelKey,
} from "./expression-editor-utils";
import {
  expressionBinaryOperandClassName,
  expressionUnaryRowClassName,
} from "./expression-editor-shared";
import { useExpressionEditorReadOnly } from "./expression-editor-read-only-context";
import { ExpressionOperatorSelect } from "./ExpressionOperatorSelect";

interface UnaryExpressionPanelProps {
  readonly value: Extract<ExpressionNode, { kind: "unary" }>;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly renderNode: ExpressionEditorNodeRenderer;
}

export function UnaryExpressionPanel({
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  renderNode,
}: UnaryExpressionPanelProps) {
  const { t } = useTranslation("common");
  const readOnly = useExpressionEditorReadOnly();
  const operators = listUnaryOperators();

  return (
    <div className={expressionUnaryRowClassName}>
      <div className="flex shrink-0 flex-col gap-1 sm:pt-6">
        <FieldLabel className="sr-only">
          {t("dataHooks.expression.operator")}
        </FieldLabel>
        <ExpressionOperatorSelect
          value={value.op}
          options={operators}
          disabled={readOnly}
          ariaLabel={t("dataHooks.expression.operator")}
          getLabel={(op) => t(unaryOperatorLabelKey(op), { defaultValue: op })}
          onChange={(op) => onChange({ ...value, op })}
        />
      </div>
      <div className={`${expressionBinaryOperandClassName} min-w-0 flex-1`}>
        {renderNode({
          label: t("dataHooks.expression.operand"),
          value: value.operand,
          onChange: (operand) => onChange({ ...value, operand }),
          fieldNames,
          loadedBindings,
          aggregateBindings,
        })}
      </div>
    </div>
  );
}
