import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, Select, Text } from "@repo/ui";
import type { ExpressionNode } from "@repo/hooks";

import type { ExpressionEditorNodeRenderer } from "./expression-editor-node-types";
import { expressionControlClassName } from "./expression-editor-shared";
import { useExpressionEditorReadOnly } from "./expression-editor-read-only-context";
import {
  listFormulaDefinitions,
  type FormulaDefinitionRecord,
} from "../../lib/api-client";

interface FormulaExpressionPanelProps {
  readonly value: Extract<ExpressionNode, { kind: "formula" }>;
  readonly onChange: (
    node: Extract<ExpressionNode, { kind: "formula" }>,
  ) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly {
    readonly alias: string;
    readonly entity: string;
  }[];
  readonly aggregateBindings?: readonly string[];
  readonly renderNode: ExpressionEditorNodeRenderer;
}

export function FormulaExpressionPanel({
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  renderNode,
}: FormulaExpressionPanelProps) {
  const { t } = useTranslation("common");
  const readOnly = useExpressionEditorReadOnly();
  const [catalog, setCatalog] = useState<readonly FormulaDefinitionRecord[]>(
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void listFormulaDefinitions()
      .then((result) => {
        if (!cancelled) {
          setCatalog(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFormula = useMemo(
    () => catalog.find((entry) => entry.name === value.name) ?? null,
    [catalog, value.name],
  );

  const renderFormulaInputNode: ExpressionEditorNodeRenderer = (nestedProps) =>
    renderNode({ ...nestedProps, formulaCatalog: catalog });

  return (
    <div className="space-y-3">
      <FieldLabel>{t("formulas.expression.formulaName")}</FieldLabel>
      <Select
        className={expressionControlClassName}
        value={value.name}
        disabled={readOnly}
        onChange={(event) => {
          const nextName = event.target.value;
          const nextFormula = catalog.find((entry) => entry.name === nextName);
          const nextInputs: Record<string, ExpressionNode> = {};
          for (const input of nextFormula?.inputs ?? []) {
            nextInputs[input.name] = value.inputs[input.name] ?? {
              kind: "literal",
              value: null,
            };
          }
          onChange({ kind: "formula", name: nextName, inputs: nextInputs });
        }}
      >
        <option value="">{t("formulas.expression.selectFormula")}</option>
        {catalog.map((entry) => (
          <option key={entry.id} value={entry.name}>
            {entry.name}
            {entry.source === "platform" ? " (platform)" : ""}
          </option>
        ))}
      </Select>

      {selectedFormula?.description ? (
        <Text className="text-sm text-muted-foreground">
          {selectedFormula.description}
        </Text>
      ) : null}

      {(selectedFormula?.inputs ?? []).map((input) => (
        <div key={input.name} className="space-y-1">
          <FieldLabel>{input.name}</FieldLabel>
          {renderFormulaInputNode({
            value: value.inputs[input.name] ?? { kind: "literal", value: null },
            onChange: (next) =>
              onChange({
                ...value,
                inputs: { ...value.inputs, [input.name]: next },
              }),
            fieldNames,
            loadedBindings,
            aggregateBindings,
          })}
        </div>
      ))}
    </div>
  );
}
