import { useTranslation } from "react-i18next";
import type { ExpressionNode } from "@repo/hooks";
import { MAX_SWITCH_CASES } from "@repo/hooks";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { Button, FieldLabel, Text } from "@repo/ui";

import { summarizeExpressionNode } from "../formulas/format-expression-dsl-preview";
import type {
  ExpressionEditorNodeRenderer,
  LoadedBinding,
} from "./expression-editor-node-types";
import {
  canAddSwitchCase,
  canRemoveSwitchCase,
  createDefaultSwitchCase,
} from "./expression-editor-utils";
import { expressionNestedClassName } from "./expression-editor-shared";
import { useExpressionEditorReadOnly } from "./expression-editor-read-only-context";

interface SwitchExpressionPanelProps {
  readonly value: Extract<ExpressionNode, { kind: "switch" }>;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly renderNode: ExpressionEditorNodeRenderer;
  readonly collapsibleNested?: boolean;
}

function summarizeSwitchBranch(node: ExpressionNode): string {
  const summary = summarizeExpressionNode(node);
  return summary.length > 40 ? `${summary.slice(0, 37)}...` : summary;
}

export function SwitchExpressionPanel({
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  renderNode,
  collapsibleNested = false,
}: SwitchExpressionPanelProps) {
  const { t } = useTranslation("common");
  const readOnly = useExpressionEditorReadOnly();

  function handleInputChange(input: ExpressionNode) {
    onChange({ ...value, input });
  }

  function handleCaseChange(
    index: number,
    branch: "when" | "then",
    node: ExpressionNode,
  ) {
    const cases = value.cases.map((switchCase, caseIndex) =>
      caseIndex === index ? { ...switchCase, [branch]: node } : switchCase,
    );
    onChange({ ...value, cases });
  }

  function handleDefaultChange(defaultNode: ExpressionNode) {
    onChange({ ...value, default: defaultNode });
  }

  function handleAddCase() {
    if (!canAddSwitchCase(value.cases.length)) {
      return;
    }
    onChange({
      ...value,
      cases: [...value.cases, createDefaultSwitchCase()],
    });
  }

  function handleRemoveCase(index: number) {
    if (!canRemoveSwitchCase(value.cases.length)) {
      return;
    }
    onChange({
      ...value,
      cases: value.cases.filter((_, caseIndex) => caseIndex !== index),
    });
  }

  function renderCaseBody(
    switchCase: (typeof value.cases)[number],
    index: number,
  ) {
    return (
      <>
        <div className="space-y-2">
          <FieldLabel>{t("dataHooks.expression.switchWhen")}</FieldLabel>
          {renderNode({
            value: switchCase.when,
            onChange: (next) => handleCaseChange(index, "when", next),
            fieldNames,
            loadedBindings,
            aggregateBindings,
          })}
        </div>
        <div className="space-y-2">
          <FieldLabel>{t("dataHooks.expression.switchThen")}</FieldLabel>
          {renderNode({
            value: switchCase.then,
            onChange: (next) => handleCaseChange(index, "then", next),
            fieldNames,
            loadedBindings,
            aggregateBindings,
          })}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className={expressionNestedClassName}>
        <FieldLabel>{t("dataHooks.expression.switchInput")}</FieldLabel>
        {renderNode({
          value: value.input,
          onChange: handleInputChange,
          fieldNames,
          loadedBindings,
          aggregateBindings,
        })}
      </div>

      <div className="space-y-3">
        <Text className="text-sm font-medium">
          {t("dataHooks.expression.switchCases")}
        </Text>
        {value.cases.map((switchCase, index) => {
          const caseTitle = t(
            "dataHooks.expression.switchCaseCollapsibleTitle",
            {
              index: index + 1,
              when: summarizeExpressionNode(switchCase.when),
              then: summarizeSwitchBranch(switchCase.then),
            },
          );

          if (collapsibleNested) {
            return (
              <CollapsibleEditorCard
                key={index}
                title={caseTitle}
                defaultOpen={false}
                className="bg-muted/20 shadow-sm"
                headerEnd={
                  canRemoveSwitchCase(value.cases.length) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={readOnly}
                      onClick={() => handleRemoveCase(index)}
                    >
                      {t("dataHooks.expression.removeSwitchCase")}
                    </Button>
                  ) : undefined
                }
              >
                {renderCaseBody(switchCase, index)}
              </CollapsibleEditorCard>
            );
          }

          return (
            <div
              key={index}
              className={`${expressionNestedClassName} space-y-3 border-b pb-3 last:border-b-0 last:pb-0`}
            >
              <div className="flex items-center justify-between gap-2">
                <Text className="text-sm font-medium">
                  {t("dataHooks.expression.switchCaseIndex", {
                    index: index + 1,
                  })}
                </Text>
                {canRemoveSwitchCase(value.cases.length) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={readOnly}
                    onClick={() => handleRemoveCase(index)}
                  >
                    {t("dataHooks.expression.removeSwitchCase")}
                  </Button>
                ) : null}
              </div>
              {renderCaseBody(switchCase, index)}
            </div>
          );
        })}
        {canAddSwitchCase(value.cases.length) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={readOnly}
            onClick={handleAddCase}
          >
            {t("dataHooks.expression.addSwitchCase")}
          </Button>
        ) : (
          <Text className="text-muted-foreground text-xs">
            {t("dataHooks.expression.switchMaxCasesHint", {
              max: MAX_SWITCH_CASES,
            })}
          </Text>
        )}
      </div>

      {renderNode({
        value: value.default,
        onChange: handleDefaultChange,
        fieldNames,
        loadedBindings,
        aggregateBindings,
        label: t("dataHooks.expression.switchDefault"),
      })}
    </div>
  );
}
