import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DateUnit, ExpressionFunction, ExpressionNode } from "@repo/hooks";
import { DATE_UNITS } from "@repo/hooks";
import { Button, FieldLabel, Select, Text } from "@repo/ui";

import type {
  ExpressionEditorNodeRenderer,
  LoadedBinding,
} from "./expression-editor-node-types";
import {
  canAddCallArgument,
  canRemoveCallArgument,
  createDefaultCallArgs,
  expressionFunctionLabelKey,
  listExpressionFunctions,
  literalExpression,
  shouldShowCallArgument,
} from "./expression-editor-utils";
import { expressionControlClassName } from "./expression-editor-shared";

interface CallExpressionPanelProps {
  readonly value: Extract<ExpressionNode, { kind: "call" }>;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly renderNode: ExpressionEditorNodeRenderer;
}

function isDateUnitLiteral(
  node: ExpressionNode,
): node is { kind: "literal"; value: DateUnit } {
  return (
    node.kind === "literal" &&
    typeof node.value === "string" &&
    (DATE_UNITS as readonly string[]).includes(node.value)
  );
}

export function CallExpressionPanel({
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  renderNode,
}: CallExpressionPanelProps) {
  const { t } = useTranslation("common");
  const functions = listExpressionFunctions();
  const useOptionalThirdArg = value.fn === "substring" && value.args.length > 2;

  const visibleArgIndexes = useMemo(() => {
    const indexes: number[] = [];
    for (let index = 0; index < value.args.length; index += 1) {
      if (
        shouldShowCallArgument(value.fn, index, value.args, useOptionalThirdArg)
      ) {
        indexes.push(index);
      }
    }
    return indexes;
  }, [useOptionalThirdArg, value.args, value.fn]);

  function handleFunctionChange(fn: ExpressionFunction) {
    onChange({
      kind: "call",
      fn,
      args: createDefaultCallArgs(fn, []),
    });
  }

  function handleArgChange(index: number, arg: ExpressionNode) {
    const args = [...value.args];
    args[index] = arg;
    onChange({ ...value, args });
  }

  function handleDateUnitChange(index: number, unit: DateUnit) {
    handleArgChange(index, literalExpression(unit));
  }

  function handleAddArgument() {
    if (!canAddCallArgument(value.fn, value.args.length)) {
      return;
    }
    onChange({
      ...value,
      args: [...value.args, literalExpression("")],
    });
  }

  function handleRemoveArgument(index: number) {
    if (!canRemoveCallArgument(value.fn, value.args.length)) {
      return;
    }
    onChange({
      ...value,
      args: value.args.filter((_, argIndex) => argIndex !== index),
    });
  }

  function handleOptionalThirdArgToggle(enabled: boolean) {
    if (value.fn !== "substring") {
      return;
    }
    if (enabled) {
      const args = [...value.args];
      while (args.length < 3) {
        args.push(literalExpression(0));
      }
      onChange({ ...value, args });
      return;
    }
    onChange({ ...value, args: value.args.slice(0, 2) });
  }

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>{t("dataHooks.expression.function")}</FieldLabel>
        <Select
          className={expressionControlClassName}
          value={value.fn}
          onChange={(event) =>
            handleFunctionChange(event.target.value as ExpressionFunction)
          }
        >
          {functions.map((fn) => (
            <option key={fn} value={fn}>
              {t(expressionFunctionLabelKey(fn), { defaultValue: fn })}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        <Text className="text-sm font-medium">
          {t("dataHooks.expression.arguments")}
        </Text>
        {visibleArgIndexes.map((index) => {
          const arg = value.args[index];
          if (!arg) {
            return null;
          }
          const argSpecKind =
            value.fn === "dateAdd" || value.fn === "dateDiff"
              ? index === 2
                ? "dateUnit"
                : "expression"
              : "expression";

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>
                  {t("dataHooks.expression.argumentIndex", {
                    index: index + 1,
                  })}
                </FieldLabel>
                {canRemoveCallArgument(value.fn, value.args.length) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveArgument(index)}
                  >
                    {t("dataHooks.expression.removeArgument")}
                  </Button>
                ) : null}
              </div>
              {argSpecKind === "dateUnit" ? (
                <Select
                  className={expressionControlClassName}
                  value={isDateUnitLiteral(arg) ? arg.value : "DAY"}
                  onChange={(event) =>
                    handleDateUnitChange(index, event.target.value as DateUnit)
                  }
                >
                  {DATE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {t(`dataHooks.expression.dateUnits.${unit}`, {
                        defaultValue: unit,
                      })}
                    </option>
                  ))}
                </Select>
              ) : (
                renderNode({
                  value: arg,
                  onChange: (next) => handleArgChange(index, next),
                  fieldNames,
                  loadedBindings,
                  aggregateBindings,
                })
              )}
            </div>
          );
        })}
      </div>

      {value.fn === "substring" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useOptionalThirdArg}
            onChange={(event) =>
              handleOptionalThirdArgToggle(event.target.checked)
            }
          />
          {t("dataHooks.expression.useEndIndex")}
        </label>
      ) : null}

      {canAddCallArgument(value.fn, value.args.length) ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddArgument}
        >
          {t("dataHooks.expression.addArgument")}
        </Button>
      ) : null}
    </div>
  );
}
