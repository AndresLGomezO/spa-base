import type { DataHookConditionNode } from "@repo/hooks";
import { VALUELESS_CONDITION_OPERATORS } from "@repo/hooks";

import { humanizeExpression } from "./hook-preview-expression.js";
import type { HookPreviewBuildContext } from "./hook-preview-types.js";

function operatorPhrase(
  operator: string,
  context: HookPreviewBuildContext,
): string {
  const key = `dataHooks.preview.operators.${operator}`;
  const translated = context.t(key);
  return translated === key ? operator : translated;
}

function formatConditionLeaf(
  node: Extract<DataHookConditionNode, { type: "condition" }>,
  context: HookPreviewBuildContext,
  entityName: string,
): string {
  const field = context.fieldLabel(entityName, node.field);
  const op = operatorPhrase(node.operator, context);

  if (
    VALUELESS_CONDITION_OPERATORS.includes(
      node.operator as (typeof VALUELESS_CONDITION_OPERATORS)[number],
    )
  ) {
    return context.t("dataHooks.preview.conditionLeafValueless", {
      field,
      operator: op,
    });
  }

  const valueText = node.value
    ? humanizeExpression(node.value, context, { entityName }).text
    : context.t("dataHooks.preview.literalEmpty");

  return context.t("dataHooks.preview.conditionLeaf", {
    field,
    operator: op,
    value: valueText,
  });
}

export function formatConditionBullets(
  node: DataHookConditionNode,
  context: HookPreviewBuildContext,
  entityName: string,
): readonly string[] {
  if (node.type === "condition") {
    return [formatConditionLeaf(node, context, entityName)];
  }

  const childBullets = node.children.flatMap((child) =>
    formatConditionBullets(child, context, entityName),
  );

  if (node.combinator === "or") {
    return childBullets.map((line) =>
      context.t("dataHooks.preview.conditionOrItem", { line }),
    );
  }

  return childBullets;
}

export function formatConditionGroupTitle(
  node: DataHookConditionNode,
  context: HookPreviewBuildContext,
): string | undefined {
  if (node.type !== "group") {
    return undefined;
  }
  return node.combinator === "or"
    ? context.t("dataHooks.preview.conditionGroupOr")
    : context.t("dataHooks.preview.conditionGroupAnd");
}
