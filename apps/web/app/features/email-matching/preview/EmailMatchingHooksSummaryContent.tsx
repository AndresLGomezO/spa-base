import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { emailTriggerAppliesToBinding, isEmailTrigger } from "@repo/hooks";
import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { Workflow } from "lucide-react";

import {
  getEntityLabel,
  tryGetEntityDefinition,
} from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import {
  listDataHooks,
  type DataHookDefinitionRecord,
  type EmailMatchBindingRecord,
} from "../../../lib/api-client";
import { DATA_HOOK_LIST_ROW_HOVER_CLASS } from "../../data-hooks/data-hook-list-styles";

interface EmailMatchingHooksSummaryContentProps {
  readonly binding: EmailMatchBindingRecord;
}

function sortEmailHooks(
  hooks: readonly DataHookDefinitionRecord[],
): DataHookDefinitionRecord[] {
  return [...hooks].sort(
    (left, right) =>
      left.order - right.order || left.name.localeCompare(right.name),
  );
}

export function EmailMatchingHooksSummaryContent({
  binding,
}: EmailMatchingHooksSummaryContentProps) {
  const { t } = useTranslation("common");
  const { items: catalog } = useEntityCatalog();
  const entityDefinition = tryGetEntityDefinition(binding.entityName, catalog);
  const entityLabel = entityDefinition
    ? getEntityLabel(entityDefinition)
    : binding.entityName;

  const hooksQuery = useQuery({
    queryKey: [
      "email-matching-entity-email-hooks",
      binding.entityName,
      binding.id,
    ],
    queryFn: () => listDataHooks({ entity: binding.entityName }),
    enabled: binding.entityName.trim().length > 0,
  });

  const emailHooks = useMemo(() => {
    const items = hooksQuery.data?.items ?? [];
    return sortEmailHooks(
      items.filter(
        (hook) =>
          isEmailTrigger(hook.trigger) &&
          hook.phase === "after" &&
          emailTriggerAppliesToBinding(hook.trigger, binding.id),
      ),
    );
  }, [binding.id, hooksQuery.data?.items]);

  const enabledCount = emailHooks.filter((hook) => hook.enabled).length;
  const automationHref = `/settings/automation?entity=${encodeURIComponent(binding.entityName)}&triggerKind=email`;

  return (
    <div className="space-y-3">
      <div className="border-border bg-card rounded-lg border p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            <Workflow aria-hidden className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Text className="text-foreground text-sm font-semibold">
              {t("emailMatchingWorkbench.preview.hooks.title")}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {t("emailMatchingWorkbench.preview.hooks.summary", {
                entity: entityLabel,
                count: enabledCount,
              })}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {t("emailMatchingWorkbench.preview.hooks.hint")}
            </Text>
          </div>
        </div>
      </div>

      {hooksQuery.isLoading ? (
        <Text className="text-muted-foreground px-1 text-sm">
          {t("emailMatchingWorkbench.preview.hooks.loading")}
        </Text>
      ) : hooksQuery.isError ? (
        <Text className="text-destructive px-1 text-sm">
          {t("emailMatchingWorkbench.preview.hooks.error")}
        </Text>
      ) : emailHooks.length === 0 ? (
        <div className="border-border bg-muted/20 space-y-2 rounded-lg border border-dashed p-3">
          <Text className="text-muted-foreground text-sm">
            {t("emailMatchingWorkbench.preview.hooks.empty", {
              entity: entityLabel,
            })}
          </Text>
          <Link
            to={automationHref}
            className="text-primary text-sm font-medium"
          >
            {t("emailMatchingWorkbench.preview.hooks.openAutomation")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {emailHooks.map((hook) => {
            const actionCount = hook.actions?.length ?? 0;
            const scoped =
              isEmailTrigger(hook.trigger) &&
              (hook.trigger.bindingIds?.length ?? 0) > 0;
            return (
              <li key={hook.id}>
                <Link
                  to={automationHref}
                  className={cn(
                    "border-border bg-card flex w-full min-w-0 items-start gap-3 rounded-lg border p-3 shadow-sm transition-colors",
                    DATA_HOOK_LIST_ROW_HOVER_CLASS,
                    !hook.enabled && "opacity-70",
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text
                        className={cn(
                          "text-sm font-semibold",
                          !hook.enabled && "text-muted-foreground",
                        )}
                      >
                        {hook.name}
                      </Text>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                          hook.enabled
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {hook.enabled
                          ? t("dataHooks.list.statusEnabled")
                          : t("dataHooks.list.statusDisabled")}
                      </span>
                      <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                        {scoped
                          ? t(
                              "emailMatchingWorkbench.preview.hooks.scopeSelected",
                            )
                          : t("emailMatchingWorkbench.preview.hooks.scopeAny")}
                      </span>
                    </div>
                    {hook.description ? (
                      <Text className="text-muted-foreground text-xs">
                        {hook.description}
                      </Text>
                    ) : null}
                    <Text className="text-muted-foreground text-xs">
                      {t("emailMatchingWorkbench.preview.hooks.meta", {
                        order: hook.order,
                        actions: actionCount,
                        phase: t("dataHooks.phase.after"),
                        trigger: t("dataHooks.triggerKind.email"),
                      })}
                    </Text>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {emailHooks.length > 0 ? (
        <div className="px-1">
          <Link
            to={automationHref}
            className="text-primary text-sm font-medium"
          >
            {t("emailMatchingWorkbench.preview.hooks.openAutomation")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
