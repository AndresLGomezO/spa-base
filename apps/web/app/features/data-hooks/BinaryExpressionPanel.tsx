import { useTranslation } from "react-i18next";
import type { ExpressionBinaryOperator, ExpressionNode } from "@repo/hooks";
import { FieldLabel, Select } from "@repo/ui";

import type { ExpressionEditorNodeRenderer } from "./expression-editor-node-types";
import {
  binaryOperatorLabelKey,
  listBinaryOperators,
} from "./expression-editor-utils";
import {
  expressionControlClassName,
  expressionNestedClassName,
} from "./expression-editor-shared";

interface BinaryExpressionPanelProps {
  readonly value: Extract<ExpressionNode, { kind: "binary" }>;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly renderNode: ExpressionEditorNodeRenderer;
}

export function BinaryExpressionPanel({
  value,
  onChange,
  fieldNames,
  renderNode,
}: BinaryExpressionPanelProps) {
  const { t } = useTranslation("common");
  const operators = listBinaryOperators();

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
              op: event.target.value as ExpressionBinaryOperator,
            })
          }
        >
          {operators.map((op) => (
            <option key={op} value={op}>
              {t(binaryOperatorLabelKey(op), { defaultValue: op })}
            </option>
          ))}
        </Select>
      </div>
      <div className={expressionNestedClassName}>
        {renderNode({
          label: t("dataHooks.expression.leftOperand"),
          value: value.left,
          onChange: (left) => onChange({ ...value, left }),
          fieldNames,
        })}
        {renderNode({
          label: t("dataHooks.expression.rightOperand"),
          value: value.right,
          onChange: (right) => onChange({ ...value, right }),
          fieldNames,
        })}
      </div>
    </div>
  );
}
