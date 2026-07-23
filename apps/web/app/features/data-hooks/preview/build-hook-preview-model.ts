import { isEmailTrigger, isScheduleTrigger } from "@repo/hooks";

import { buildActionSteps } from "./hook-preview-actions.js";
import { collectFormulaNamesInCondition } from "./collect-hook-formula-names.js";
import {
  formatConditionBullets,
  formatConditionGroupTitle,
} from "./hook-preview-condition.js";
import type {
  HookPreviewBuildContext,
  HookPreviewInput,
  HookPreviewModel,
  HookPreviewStep,
} from "./hook-preview-types.js";

function buildTriggerStep(
  hook: HookPreviewInput,
  context: HookPreviewBuildContext,
): HookPreviewStep {
  const entity = context.entityLabel(hook.entity);

  if (isScheduleTrigger(hook.trigger)) {
    const scopeKey = hook.trigger.scope ?? "once";
    const summary = context.t("dataHooks.preview.trigger.schedule", {
      entity,
      cron: hook.trigger.cron,
      timezone: hook.trigger.timezone ?? "UTC",
      scope: context.t(`dataHooks.scheduleScope.${scopeKey}`),
    });
    return {
      id: "trigger",
      kind: "trigger",
      icon: "trigger",
      title: context.t("dataHooks.preview.steps.trigger"),
      summary,
    };
  }

  if (isEmailTrigger(hook.trigger)) {
    const bindingCount = hook.trigger.bindingIds?.length ?? 0;
    const bullets =
      bindingCount > 0
        ? [
            context.t("dataHooks.preview.trigger.emailBindingsSelected", {
              count: bindingCount,
            }),
          ]
        : [context.t("dataHooks.preview.trigger.emailBindingsAny")];
    return {
      id: "trigger",
      kind: "trigger",
      icon: "trigger",
      title: context.t("dataHooks.preview.steps.trigger"),
      summary: context.t("dataHooks.preview.trigger.email", { entity }),
      bullets,
    };
  }

  const operation = hook.trigger.operation;
  const phase = hook.phase;
  const summary = context.t(
    `dataHooks.preview.trigger.crud.${operation}.${phase}`,
    { entity },
  );

  const bullets: string[] = [];
  if (
    hook.trigger.operation === "update" &&
    hook.trigger.updateFields &&
    hook.trigger.updateFields.length > 0
  ) {
    bullets.push(
      context.t("dataHooks.preview.trigger.updateFields", {
        fields: hook.trigger.updateFields
          .map((field: string) => context.fieldLabel(hook.entity, field))
          .join(", "),
      }),
    );
  }

  return {
    id: "trigger",
    kind: "trigger",
    icon: "trigger",
    title: context.t("dataHooks.preview.steps.trigger"),
    summary,
    ...(bullets.length > 0 ? { bullets } : {}),
  };
}

function buildConditionStep(
  hook: HookPreviewInput,
  context: HookPreviewBuildContext,
): HookPreviewStep | null {
  if (!hook.condition) {
    return null;
  }

  const bullets = formatConditionBullets(hook.condition, context, hook.entity);
  const groupTitle = formatConditionGroupTitle(hook.condition, context);

  return {
    id: "condition",
    kind: "condition",
    icon: "condition",
    title: context.t("dataHooks.preview.steps.condition"),
    summary:
      groupTitle ?? context.t("dataHooks.preview.steps.conditionSummary"),
    bullets,
    formulaNames: collectFormulaNamesInCondition(hook.condition),
  };
}

function buildMetaChips(
  hook: HookPreviewInput,
  context: HookPreviewBuildContext,
): readonly string[] {
  const chips: string[] = [];
  if (hook.execution && hook.execution !== "sync") {
    chips.push(context.t(`dataHooks.execution.${hook.execution}`));
  }
  if (hook.chainHooks) {
    chips.push(context.t("dataHooks.preview.meta.chainHooks"));
  }
  if (!hook.enabled) {
    chips.push(context.t("dataHooks.settings.disabled"));
  }
  return chips;
}

export function buildHookPreviewModel(
  hook: HookPreviewInput,
  context: HookPreviewBuildContext,
): HookPreviewModel {
  const steps: HookPreviewStep[] = [buildTriggerStep(hook, context)];

  const conditionStep = buildConditionStep(hook, context);
  if (conditionStep) {
    steps.push(conditionStep);
  }

  steps.push(...buildActionSteps(hook.actions, context));

  return {
    name: hook.name,
    ...(hook.description ? { description: hook.description } : {}),
    steps,
    metaChips: buildMetaChips(hook, context),
  };
}
