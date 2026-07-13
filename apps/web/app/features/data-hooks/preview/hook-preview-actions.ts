import type {
  DataHookAction,
  DataHookConditionNode,
  ExpressionNode,
} from "@repo/hooks";

import { collectFormulaNamesInAction } from "./collect-hook-formula-names.js";
import { getFormulaPreviewDescriptor } from "./hook-preview-formula-catalog.js";
import {
  formatConditionBullets,
  formatConditionGroupTitle,
} from "./hook-preview-condition.js";
import {
  collectExpressionWidgets,
  humanizeExpression,
} from "./hook-preview-expression.js";
import type {
  ActionPipelineState,
  HookPreviewBuildContext,
  HookPreviewDetailSection,
  HookPreviewStep,
  HookPreviewWidget,
} from "./hook-preview-types.js";

function mergeWidgets(
  ...groups: readonly (readonly HookPreviewWidget[] | undefined)[]
): readonly HookPreviewWidget[] {
  const seen = new Set<string>();
  const widgets: HookPreviewWidget[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const widget of group) {
      const key = JSON.stringify(widget);
      if (!seen.has(key)) {
        seen.add(key);
        widgets.push(widget);
      }
    }
  }
  return widgets;
}

function formatWhereSection(
  where: DataHookConditionNode,
  context: HookPreviewBuildContext,
  entityName: string,
): HookPreviewDetailSection {
  return {
    title: context.t("dataHooks.preview.details.matchWhere"),
    bullets: formatConditionBullets(where, context, entityName),
    ...(formatConditionGroupTitle(where, context)
      ? {
          bullets: [
            formatConditionGroupTitle(where, context)!,
            ...formatConditionBullets(where, context, entityName),
          ],
        }
      : {}),
  };
}

function buildLoopExampleFields(
  data: Readonly<Record<string, ExpressionNode>>,
  context: HookPreviewBuildContext,
  entityName: string,
  pipeline: ActionPipelineState,
): readonly { readonly label: string; readonly value: string }[] {
  const skip = new Set(["__loopState", "financialItemId"]);
  const fields: { label: string; value: string }[] = [];
  for (const [key, node] of Object.entries(data)) {
    if (skip.has(key) || key.startsWith("__")) continue;
    fields.push({
      label: context.fieldLabel(entityName, key),
      value: humanizeExpression(node, context, {
        entityName,
        loadedAliases: pipeline.loadedAliases,
        aggregateAliases: pipeline.aggregateAliases,
      }).text,
    });
  }
  return fields;
}

function hasLoopIndex(data: Readonly<Record<string, ExpressionNode>>): boolean {
  return Object.values(data).some(
    (node) => node.kind === "var" && node.name === "loopIndex",
  );
}

function buildActionStep(
  action: DataHookAction,
  index: number,
  context: HookPreviewBuildContext,
  pipeline: ActionPipelineState,
): { readonly step: HookPreviewStep; readonly pipeline: ActionPipelineState } {
  const advancedExpressions: { label: string; expression: ExpressionNode }[] =
    [];
  const details: HookPreviewDetailSection[] = [];
  let widgets: readonly HookPreviewWidget[] = [];
  let icon: HookPreviewStep["icon"] = "action";
  const title = context.t(`dataHooks.actionType.${action.type}`);
  let summary = title;
  let bullets: string[] | undefined;

  const exprOptions = {
    loadedAliases: pipeline.loadedAliases,
    aggregateAliases: pipeline.aggregateAliases,
  };

  switch (action.type) {
    case "setField": {
      const value = humanizeExpression(action.value, context, exprOptions);
      summary = context.t("dataHooks.preview.actions.setField", {
        field: context.fieldLabel(context.entityName, action.field),
        value: value.text,
      });
      widgets = mergeWidgets(widgets, value.widgets);
      advancedExpressions.push({
        label: context.t("dataHooks.preview.advanced.value"),
        expression: action.value,
      });
      break;
    }
    case "createRecord": {
      summary = context.t("dataHooks.preview.actions.createRecord", {
        entity: context.entityLabel(action.entity),
      });
      bullets = Object.entries(action.data).map(([field, node]) =>
        context.t("dataHooks.preview.actions.fieldAssignment", {
          field: context.fieldLabel(action.entity, field),
          value: humanizeExpression(node, context, {
            ...exprOptions,
            entityName: action.entity,
          }).text,
        }),
      );
      for (const [field, node] of Object.entries(action.data)) {
        advancedExpressions.push({ label: field, expression: node });
      }
      break;
    }
    case "createRecords": {
      icon = "loop";
      const count = humanizeExpression(action.count, context, exprOptions);
      summary = context.t("dataHooks.preview.actions.createRecords", {
        count: count.text,
        entity: context.entityLabel(action.entity),
      });
      widgets = mergeWidgets(
        widgets,
        count.widgets,
        collectExpressionWidgets(action.count, context, exprOptions),
      );
      for (const node of Object.values(action.data)) {
        widgets = mergeWidgets(
          widgets,
          collectExpressionWidgets(node, context, {
            ...exprOptions,
            entityName: action.entity,
          }),
        );
      }
      bullets = Object.entries(action.data)
        .filter(([key]) => !key.startsWith("__"))
        .map(([field, node]) =>
          context.t("dataHooks.preview.actions.fieldAssignment", {
            field: context.fieldLabel(action.entity, field),
            value: humanizeExpression(node, context, {
              ...exprOptions,
              entityName: action.entity,
            }).text,
          }),
        );
      if (hasLoopIndex(action.data)) {
        widgets = mergeWidgets(widgets, [
          {
            type: "loopExample",
            fields: buildLoopExampleFields(
              action.data,
              context,
              action.entity,
              pipeline,
            ),
          },
        ]);
      }
      advancedExpressions.push({
        label: context.t("dataHooks.preview.advanced.count"),
        expression: action.count,
      });
      for (const [field, node] of Object.entries(action.data)) {
        advancedExpressions.push({ label: field, expression: node });
      }
      break;
    }
    case "updateMatching": {
      summary = context.t("dataHooks.preview.actions.updateMatching", {
        entity: context.entityLabel(action.entity),
      });
      details.push(formatWhereSection(action.where, context, action.entity));
      bullets = Object.entries(action.set).map(([field, node]) =>
        context.t("dataHooks.preview.actions.fieldAssignment", {
          field: context.fieldLabel(action.entity, field),
          value: humanizeExpression(node, context, {
            ...exprOptions,
            entityName: action.entity,
          }).text,
        }),
      );
      for (const node of Object.values(action.set)) {
        widgets = mergeWidgets(
          widgets,
          collectExpressionWidgets(node, context, {
            ...exprOptions,
            entityName: action.entity,
          }),
        );
      }
      for (const [field, node] of Object.entries(action.set)) {
        advancedExpressions.push({ label: field, expression: node });
      }
      break;
    }
    case "deleteMatching": {
      summary = context.t("dataHooks.preview.actions.deleteMatching", {
        entity: context.entityLabel(action.entity),
      });
      details.push(formatWhereSection(action.where, context, action.entity));
      break;
    }
    case "deleteRecord": {
      summary = context.t("dataHooks.preview.actions.deleteRecord", {
        entity: context.entityLabel(action.entity),
      });
      break;
    }
    case "getRecord": {
      summary = context.t("dataHooks.preview.actions.getRecord", {
        entity: context.entityLabel(action.entity),
        alias: action.as,
      });
      break;
    }
    case "getOrCreateRecord": {
      const createIfMissing = action.createIfMissing !== false;
      const recordData = action.data ?? {};
      summary = context.t(
        createIfMissing
          ? "dataHooks.preview.actions.getOrCreateRecord"
          : "dataHooks.preview.actions.getOrCreateRecordFindOnly",
        {
          entity: context.entityLabel(action.entity),
          alias: action.as,
        },
      );
      details.push(formatWhereSection(action.where, context, action.entity));
      if (!createIfMissing) {
        details.push({
          title: context.t("dataHooks.preview.actions.createIfMissingOff"),
        });
      }
      bullets = Object.entries(recordData).map(([field, node]) =>
        context.t("dataHooks.preview.actions.fieldAssignment", {
          field: context.fieldLabel(action.entity, field),
          value: humanizeExpression(node, context, {
            ...exprOptions,
            entityName: action.entity,
          }).text,
        }),
      );
      for (const [field, node] of Object.entries(recordData)) {
        advancedExpressions.push({ label: field, expression: node });
      }
      break;
    }
    case "aggregateMatching": {
      icon = "aggregate";
      const op = context.t(`dataHooks.actions.aggregateOps.${action.op}`);
      summary = context.t("dataHooks.preview.actions.aggregateMatching", {
        op,
        entity: context.entityLabel(action.entity),
        alias: action.as,
      });
      details.push(formatWhereSection(action.where, context, action.entity));
      break;
    }
    case "sendNotification": {
      icon = "notification";
      const message = humanizeExpression(action.message, context, exprOptions);
      summary = context.t("dataHooks.preview.actions.sendNotification");
      bullets = [message.text];
      advancedExpressions.push({
        label: context.t("dataHooks.preview.advanced.message"),
        expression: action.message,
      });
      break;
    }
    case "callWebhook": {
      summary = context.t("dataHooks.preview.actions.callWebhook");
      bullets = [
        humanizeExpression(action.url, context, {
          ...exprOptions,
          preferStory: false,
        }).text,
      ];
      break;
    }
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }

  let nextPipeline = pipeline;
  if (action.type === "getRecord" || action.type === "getOrCreateRecord") {
    const loaded = new Map(pipeline.loadedAliases);
    loaded.set(action.as, action.entity);
    nextPipeline = { ...pipeline, loadedAliases: loaded };
  }
  if (action.type === "aggregateMatching") {
    const aggregates = new Set(pipeline.aggregateAliases);
    aggregates.add(action.as);
    nextPipeline = { ...pipeline, aggregateAliases: aggregates };
  }

  const step: HookPreviewStep = {
    id: `action-${index}`,
    kind: "action",
    icon,
    title,
    summary,
    ...(bullets && bullets.length > 0 ? { bullets } : {}),
    ...(details.length > 0 ? { details } : {}),
    ...(widgets.length > 0 ? { widgets } : {}),
    ...(advancedExpressions.length > 0 ? { advancedExpressions } : {}),
    formulaNames: collectFormulaNamesInAction(action),
  };

  return { step, pipeline: nextPipeline };
}

export function buildActionSteps(
  actions: readonly DataHookAction[],
  context: HookPreviewBuildContext,
): readonly HookPreviewStep[] {
  const steps: HookPreviewStep[] = [];
  let pipeline: ActionPipelineState = {
    loadedAliases: new Map(),
    aggregateAliases: new Set(),
  };

  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index]!;
    const built = buildActionStep(action, index, context, pipeline);
    steps.push(built.step);
    pipeline = built.pipeline;
  }

  return steps;
}

export function enrichFormulaDetailBullets(
  formulaName: string,
  context: HookPreviewBuildContext,
): readonly string[] {
  const descriptor = getFormulaPreviewDescriptor(formulaName);
  if (!descriptor?.detailBulletKeys) {
    return [];
  }
  return descriptor.detailBulletKeys.map((key) => context.t(key));
}
