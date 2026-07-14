import { useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button, Heading, Text, toast } from "@repo/ui";
import { ChevronDown, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { formatRecordDisplayLabel } from "../../components/entity/format-record-display-label";
import {
  getEntityLabel,
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  disconnectGmail,
  getEntity,
  getGmailStatus,
  listEmailMatchBindings,
  startGmailConnect,
  startGmailSync,
  deleteEmailMatchBinding,
} from "../../lib/api-client";

// Matches Cloud Scheduler / local worker poll cadence (every 5 minutes).
const GMAIL_POLL_INTERVAL_MS = 5 * 60 * 1000;
const GMAIL_STATUS_REFETCH_MS = 15_000;

type EmailMatchBinding = Awaited<
  ReturnType<typeof listEmailMatchBindings>
>["items"][number];

function nextCatchUpAt(ingestWatermarkAt: string): string | null {
  const last = new Date(ingestWatermarkAt);
  if (Number.isNaN(last.getTime())) return null;
  return new Date(last.getTime() + GMAIL_POLL_INTERVAL_MS).toISOString();
}

type RecordBindingGroup = {
  readonly recordId: string;
  readonly bindings: readonly EmailMatchBinding[];
};

type EntityBindingGroup = {
  readonly entityName: string;
  readonly records: readonly RecordBindingGroup[];
  readonly bindingCount: number;
  readonly enabledCount: number;
};

function groupBindingsByEntityThenRecord(
  bindings: readonly EmailMatchBinding[],
): readonly EntityBindingGroup[] {
  const entityOrder: string[] = [];
  const byEntity = new Map<
    string,
    { recordOrder: string[]; byRecord: Map<string, EmailMatchBinding[]> }
  >();

  for (const binding of bindings) {
    let entityGroup = byEntity.get(binding.entityName);
    if (!entityGroup) {
      entityGroup = { recordOrder: [], byRecord: new Map() };
      entityOrder.push(binding.entityName);
      byEntity.set(binding.entityName, entityGroup);
    }
    const existing = entityGroup.byRecord.get(binding.recordId);
    if (existing) {
      existing.push(binding);
    } else {
      entityGroup.recordOrder.push(binding.recordId);
      entityGroup.byRecord.set(binding.recordId, [binding]);
    }
  }

  return entityOrder.map((entityName) => {
    const entityGroup = byEntity.get(entityName)!;
    const records = entityGroup.recordOrder.map((recordId) => ({
      recordId,
      bindings: entityGroup.byRecord.get(recordId) ?? [],
    }));
    const allBindings = records.flatMap((record) => record.bindings);
    return {
      entityName,
      records,
      bindingCount: allBindings.length,
      enabledCount: allBindings.filter((binding) => binding.enabled).length,
    };
  });
}

function recordCollapseKey(entityName: string, recordId: string): string {
  return `${entityName}\0${recordId}`;
}

function uniqueRecordRefs(
  bindings: readonly EmailMatchBinding[],
): readonly { readonly entityName: string; readonly recordId: string }[] {
  const seen = new Set<string>();
  const refs: { entityName: string; recordId: string }[] = [];
  for (const binding of bindings) {
    const key = `${binding.entityName}\0${binding.recordId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({
      entityName: binding.entityName,
      recordId: binding.recordId,
    });
  }
  return refs;
}

export function GmailSettingsPanel() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const { items: catalog } = useEntityCatalog();
  const [searchParams] = useSearchParams();
  const gmailResult = searchParams.get("gmail");
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const statusQuery = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
    refetchInterval: (query) =>
      query.state.data?.connected ? GMAIL_STATUS_REFETCH_MS : false,
  });

  const bindingsQuery = useQuery({
    queryKey: ["gmail-bindings"],
    queryFn: () => listEmailMatchBindings(),
  });

  const bindings = useMemo(
    () => bindingsQuery.data?.items ?? [],
    [bindingsQuery.data?.items],
  );
  const recordRefs = useMemo(() => uniqueRecordRefs(bindings), [bindings]);
  const entityGroups = useMemo(
    () => groupBindingsByEntityThenRecord(bindings),
    [bindings],
  );

  const recordQueries = useQueries({
    queries: recordRefs.map((ref) => ({
      queryKey: ["gmail-binding-record", ref.entityName, ref.recordId] as const,
      queryFn: () =>
        getEntity<Record<string, unknown>>(ref.entityName, ref.recordId),
      staleTime: 60_000,
    })),
  });

  const recordLabels = useMemo(() => {
    const map = new Map<string, string>();
    recordRefs.forEach((ref, index) => {
      const record = recordQueries[index]?.data;
      if (!record) return;
      const definition = tryGetEntityDefinition(ref.entityName, catalog);
      map.set(
        `${ref.entityName}\0${ref.recordId}`,
        formatRecordDisplayLabel(record, definition?.displayField),
      );
    });
    return map;
  }, [catalog, recordQueries, recordRefs]);

  const connectMutation = useMutation({
    mutationFn: startGmailConnect,
    onSuccess: (data) => {
      window.location.href = data.authorizeUrl;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      toast.success(t("platform.email.disconnected"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncMutation = useMutation({
    mutationFn: startGmailSync,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      toast.success(t("platform.email.syncStarted", { jobId: data.jobId }));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteBindingMutation = useMutation({
    mutationFn: deleteEmailMatchBinding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gmail-bindings"] });
      toast.success(t("platform.email.bindingDeleted"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const status = statusQuery.data;
  const nextCatchUp =
    status?.ingestWatermarkAt != null
      ? nextCatchUpAt(status.ingestWatermarkAt)
      : null;

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function entityLabel(entityName: string): string {
    const definition = tryGetEntityDefinition(entityName, catalog);
    return definition ? getEntityLabel(definition) : entityName;
  }

  function recordLabel(entityName: string, recordId: string): string {
    return (
      recordLabels.get(`${entityName}\0${recordId}`) ??
      t("platform.email.recordLabelFallback", { id: recordId.slice(0, 8) })
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <Heading level={1}>{t("platform.email.title")}</Heading>
        <Text className="text-muted-foreground">
          {t("platform.email.description")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("platform.email.privacy")}
        </Text>
      </div>

      {gmailResult === "connected" ? (
        <Text className="bg-muted/40 text-sm rounded-md border px-3 py-2">
          {t("platform.email.oauthResult.connected")}
        </Text>
      ) : null}
      {gmailResult === "error" ? (
        <Text className="border-destructive/40 bg-destructive/5 text-destructive text-sm rounded-md border px-3 py-2">
          {t("platform.email.oauthResult.error")}
        </Text>
      ) : null}
      {gmailResult === "reauth_required" ? (
        <Text className="border-border bg-muted/40 text-sm rounded-md border px-3 py-2">
          {t("platform.email.oauthResult.reauth_required")}
        </Text>
      ) : null}

      <section className="border-border space-y-4 rounded-xl border p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Mail aria-hidden className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Heading level={2}>{t("platform.email.connection")}</Heading>
            {statusQuery.isLoading ? (
              <Text className="text-muted-foreground text-sm">
                {t("platform.email.loading")}
              </Text>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    status?.connected
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      : "bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  }
                >
                  <span
                    className={
                      status?.connected
                        ? "size-1.5 rounded-full bg-emerald-500"
                        : "bg-muted-foreground/50 size-1.5 rounded-full"
                    }
                    aria-hidden
                  />
                  {status?.connected
                    ? t("platform.email.connectedAs", {
                        email: status.emailAddress ?? "",
                      })
                    : t("platform.email.notConnected")}
                </span>
              </div>
            )}
          </div>
        </div>

        {!statusQuery.isLoading && status?.connected ? (
          <dl className="bg-muted/30 grid gap-3 rounded-lg px-3 py-3 text-sm sm:grid-cols-1">
            {status.ingestWatermarkAt ? (
              <>
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t("platform.email.lastCatchUpLabel")}
                  </dt>
                  <dd className="font-mono text-xs break-all">
                    {status.ingestWatermarkAt}
                  </dd>
                </div>
                {nextCatchUp ? (
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      {t("platform.email.nextCatchUpLabel")}
                    </dt>
                    <dd className="font-mono text-xs break-all">
                      {nextCatchUp}
                    </dd>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t("platform.email.lastCatchUpLabel")}
                  </dt>
                  <dd className="text-sm">
                    {t("platform.email.noCatchUpYet")}
                  </dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t("platform.email.nextCatchUpLabel")}
                  </dt>
                  <dd className="text-sm">
                    {t("platform.email.nextCatchUpBootstrap")}
                  </dd>
                </div>
              </>
            )}
          </dl>
        ) : null}

        {status?.lastError ? (
          <Text className="text-destructive text-sm">{status.lastError}</Text>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!status?.connected ? (
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || statusQuery.isLoading}
            >
              {t("platform.email.connect")}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {t("platform.email.syncNow")}
              </Button>
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {t("platform.email.disconnect")}
              </Button>
            </>
          )}
        </div>
        {status?.connected ? (
          <Text className="text-muted-foreground text-sm">
            {t("platform.email.syncNowHint")}
          </Text>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Heading level={2}>{t("platform.email.bindings")}</Heading>
          <Text className="text-muted-foreground text-sm">
            {t("platform.email.bindingsHint")}
          </Text>
        </div>

        {bindingsQuery.isLoading ? (
          <Text className="text-muted-foreground text-sm">
            {t("platform.email.loadingBindings")}
          </Text>
        ) : bindings.length === 0 ? (
          <Text className="text-muted-foreground border-border rounded-xl border border-dashed px-4 py-8 text-center text-sm">
            {t("platform.email.noBindings")}
          </Text>
        ) : (
          <div className="space-y-3">
            {entityGroups.map((group) => {
              const entityExpanded = expandedKeys.has(group.entityName);
              const label = entityLabel(group.entityName);
              return (
                <div
                  key={group.entityName}
                  className="border-border overflow-hidden rounded-xl border shadow-sm"
                >
                  <button
                    type="button"
                    className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    aria-expanded={entityExpanded}
                    onClick={() => toggleExpanded(group.entityName)}
                  >
                    <ChevronDown
                      aria-hidden
                      className={`text-muted-foreground size-4 shrink-0 transition-transform ${
                        entityExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <Text className="font-medium">{label}</Text>
                      <Text className="text-muted-foreground text-xs">
                        {t("platform.email.entityGroupSummary", {
                          records: group.records.length,
                          count: group.bindingCount,
                          enabled: group.enabledCount,
                        })}
                      </Text>
                    </div>
                  </button>

                  {entityExpanded ? (
                    <div className="border-border space-y-2 border-t bg-muted/20 p-2">
                      {group.records.map((recordGroup) => {
                        const recordKey = recordCollapseKey(
                          group.entityName,
                          recordGroup.recordId,
                        );
                        const recordExpanded = expandedKeys.has(recordKey);
                        const name = recordLabel(
                          group.entityName,
                          recordGroup.recordId,
                        );
                        const recordEnabled = recordGroup.bindings.filter(
                          (binding) => binding.enabled,
                        ).length;
                        return (
                          <div
                            key={recordKey}
                            className="border-border bg-background overflow-hidden rounded-lg border"
                          >
                            <div className="flex items-stretch">
                              <button
                                type="button"
                                className="hover:bg-muted/40 flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors"
                                aria-expanded={recordExpanded}
                                onClick={() => toggleExpanded(recordKey)}
                              >
                                <ChevronDown
                                  aria-hidden
                                  className={`text-muted-foreground size-4 shrink-0 transition-transform ${
                                    recordExpanded ? "rotate-0" : "-rotate-90"
                                  }`}
                                />
                                <div className="min-w-0 flex-1">
                                  <Text className="truncate text-sm font-medium">
                                    {name}
                                  </Text>
                                  <Text className="text-muted-foreground text-xs">
                                    {t("platform.email.bindingGroupSummary", {
                                      count: recordGroup.bindings.length,
                                      enabled: recordEnabled,
                                    })}
                                  </Text>
                                </div>
                              </button>
                              <Link
                                to={`/app/${encodeURIComponent(group.entityName)}/${encodeURIComponent(recordGroup.recordId)}`}
                                className="text-primary hover:bg-muted/40 border-border inline-flex shrink-0 items-center border-l px-3 text-xs font-medium"
                              >
                                {t("platform.email.openRecord")}
                              </Link>
                            </div>

                            {recordExpanded ? (
                              <ul className="border-border divide-border divide-y border-t">
                                {recordGroup.bindings.map((binding) => (
                                  <li
                                    key={binding.id}
                                    className="flex flex-wrap items-start justify-between gap-3 px-3 py-3"
                                  >
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={
                                            binding.enabled
                                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-0.5 text-[11px] font-medium"
                                              : "bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium"
                                          }
                                        >
                                          {binding.enabled
                                            ? t("platform.email.enabled")
                                            : t("platform.email.disabled")}
                                        </span>
                                        {binding.useAi ? (
                                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium">
                                            {t("platform.email.aiEnabled")}
                                          </span>
                                        ) : null}
                                      </div>
                                      <Text className="text-muted-foreground text-sm">
                                        {binding.fromAddresses.join(", ") ||
                                          t("platform.email.noSenders")}
                                      </Text>
                                      {binding.subjectPatterns.length > 0 ? (
                                        <Text className="text-muted-foreground text-xs">
                                          {t("platform.email.subjectPatterns")}:{" "}
                                          {binding.subjectPatterns.join(", ")}
                                        </Text>
                                      ) : null}
                                      {(binding.bodyFieldExtractors?.length ??
                                        0) > 0 && !binding.useAi ? (
                                        <Text className="text-muted-foreground text-xs">
                                          {t(
                                            "platform.email.bodyExtractEnabled",
                                            {
                                              count:
                                                binding.bodyFieldExtractors
                                                  ?.length ?? 0,
                                            },
                                          )}
                                        </Text>
                                      ) : null}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        deleteBindingMutation.mutate(binding.id)
                                      }
                                      disabled={deleteBindingMutation.isPending}
                                    >
                                      {t("platform.email.deleteBinding")}
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
