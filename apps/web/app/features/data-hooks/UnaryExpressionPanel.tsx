import { useTranslation } from "react-i18next";
import type { ExpressionNode, ExpressionUnaryOperator } from "@repo/hooks";
import { FieldLabel, Select } from "@repo/ui";

import type { ExpressionEditorNodeRenderer } from "./expression-editor-node-types";
import {
  listUnaryOperators,
  unaryOperatorLabelKey,
} from "./expression-editor-utils";
import {
  expressionControlClassName,
  expressionNestedClassName,
} from "./expression-editor-shared";

interface UnaryExpressionPanelProps {
  readonly value: Extract<ExpressionNode, { kind: "unary" }>;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly renderNode: ExpressionEditorNodeRenderer;
}

export function UnaryExpressionPanel({
  value,
  onChange,
  fieldNames,
  renderNode,
}: UnaryExpressionPanelProps) {
  const { t } = useTranslation("common");
  const operators = listUnaryOperators();

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>{t("dataHooks.expression.operator")}</FieldLabel>
        <Select
          className={expressionControlClassName}
          value={value.op}
          onChange={(event) =>
            onChange({
              ...value,
              op: event.target.value as ExpressionUnaryOperator,
            })
          }
        >
          {operators.map((op) => (
            <option key={op} value={op}>
              {t(unaryOperatorLabelKey(op), { defaultValue: op })}
            </option>
          ))}
        </Select>
      </div>
      <div className={expressionNestedClassName}>
        {renderNode({
          label: t("dataHooks.expression.operand"),
          value: value.operand,
          onChange: (operand) => onChange({ ...value, operand }),
          fieldNames,
        })}
      </div>
    </div>
  );
}
