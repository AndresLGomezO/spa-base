import type { ExpressionNode } from "@repo/hooks";

import { summarizeExpressionNode } from "../../formulas/format-expression-dsl-preview";
import {
  getFormulaPreviewDescriptor,
  humanizeFormulaName,
} from "./hook-preview-formula-catalog.js";
import type {
  HookPreviewBuildContext,
  HookPreviewWidget,
} from "./hook-preview-types.js";

const VAR_LABEL_KEYS: Readonly<Record<string, string>> = {
  loopIndex: "dataHooks.preview.vars.loopIndex",
  loopState: "dataHooks.preview.vars.loopState",
  now: "dataHooks.preview.vars.now",
  userId: "dataHooks.preview.vars.userId",
};

const FIELD_PATH_LABEL_KEYS: Readonly<Record<string, string>> = {
  nextDueDate: "dataHooks.preview.fields.nextDueDate",
  frequency: "dataHooks.preview.fields.frequency",
  amount: "dataHooks.preview.fields.amount",
  scheduleHorizonMonths: "dataHooks.preview.fields.scheduleHorizonMonths",
  revolvingBalance: "dataHooks.preview.fields.revolvingBalance",
  planRevision: "dataHooks.preview.fields.planRevision",
};

interface HumanizeExpressionResult {
  readonly text: string;
  readonly widgets?: readonly HookPreviewWidget[];
  readonly formulaName?: string;
}

function loadedAliasLabel(
  alias: string,
  context: HookPreviewBuildContext,
  loadedAliases?: ReadonlyMap<string, string>,
): string {
  const entityName = loadedAliases?.get(alias);
  if (entityName) {
    return context.t("dataHooks.preview.loadedAlias", {
      alias,
      entity: context.entityLabel(entityName),
    });
  }
  return context.t("dataHooks.preview.loadedAliasGeneric", { alias });
}

function fieldLabelForPath(
  path: string,
  context: HookPreviewBuildContext,
  entityName: string,
): string {
  const key = FIELD_PATH_LABEL_KEYS[path];
  if (key) {
    return context.t(key);
  }
  return context.fieldLabel(entityName, path);
}

export function humanizeExpression(
  node: ExpressionNode,
  context: HookPreviewBuildContext,
  options: {
    readonly entityName?: string;
    readonly loadedAliases?: ReadonlyMap<string, string>;
    readonly aggregateAliases?: ReadonlySet<string>;
    readonly preferStory?: boolean;
  } = {},
): HumanizeExpressionResult {
  const entityName = options.entityName ?? context.entityName;

  switch (node.kind) {
    case "literal": {
      if (node.value === null) {
        return { text: context.t("dataHooks.preview.literalEmpty") };
      }
      if (typeof node.value === "string") {
        return { text: `"${node.value}"` };
      }
      return { text: String(node.value) };
    }
    case "var": {
      const key = VAR_LABEL_KEYS[node.name];
      return { text: key ? context.t(key) : node.name };
    }
    case "field": {
      if (node.source === "aggregate") {
        return {
          text: context.t("dataHooks.preview.aggregateAlias", {
            alias: node.alias,
          }),
        };
      }
      if (node.source === "loaded") {
        const alias = loadedAliasLabel(
          node.alias,
          context,
          options.loadedAliases,
        );
        return {
          text: `${alias} · ${fieldLabelForPath(node.path, context, entityName)}`,
        };
      }
      if (node.source === "previous") {
        return {
          text: context.t("dataHooks.preview.previousField", {
            field: fieldLabelForPath(node.path, context, entityName),
          }),
        };
      }
      return { text: fieldLabelForPath(node.path, context, entityName) };
    }
    case "formula": {
      const descriptor = getFormulaPreviewDescriptor(node.name);
      if (options.preferStory !== false && descriptor) {
        return {
          text: context.t(descriptor.summaryKey),
          widgets: descriptor.widgets,
          formulaName: node.name,
        };
      }
      return {
        text: humanizeFormulaName(node.name),
        formulaName: node.name,
      };
    }
    case "call": {
      if (node.fn === "concat") {
        const parts = node.args.map(
          (arg) =>
            humanizeExpression(arg, context, {
              ...options,
              preferStory: false,
            }).text,
        );
        return { text: parts.join("") };
      }
      return { text: summarizeExpressionNode(node) };
    }
    default:
      return { text: summarizeExpressionNode(node) };
  }
}

function widgetKey(widget: HookPreviewWidget): string {
  return JSON.stringify(widget);
}

export function collectExpressionWidgets(
  node: ExpressionNode,
  context: HookPreviewBuildContext,
  options: {
    readonly entityName?: string;
    readonly loadedAliases?: ReadonlyMap<string, string>;
    readonly aggregateAliases?: ReadonlySet<string>;
  } = {},
): readonly HookPreviewWidget[] {
  const widgets: HookPreviewWidget[] = [];
  const seen = new Set<string>();

  const pushWidget = (widget: HookPreviewWidget) => {
    const key = widgetKey(widget);
    if (!seen.has(key)) {
      seen.add(key);
      widgets.push(widget);
    }
  };

  const visit = (current: ExpressionNode) => {
    const result = humanizeExpression(current, context, options);
    if (result.widgets) {
      for (const widget of result.widgets) {
        pushWidget(widget);
      }
    }
    switch (current.kind) {
      case "binary":
        visit(current.left);
        visit(current.right);
        break;
      case "unary":
        visit(current.operand);
        break;
      case "call":
        for (const arg of current.args) {
          visit(arg);
        }
        break;
      case "formula":
        for (const input of Object.values(current.inputs)) {
          visit(input);
        }
        break;
      case "switch":
        visit(current.input);
        for (const entry of current.cases) {
          visit(entry.when);
          visit(entry.then);
        }
        visit(current.default);
        break;
      default:
        break;
    }
  };

  visit(node);
  return widgets;
}
