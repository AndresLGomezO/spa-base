import { formatHookExecutionWritesSummary } from "@repo/hooks";
import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import { DebuggerResolutionBadge } from "../components/DebuggerResolutionBadge";
import { resolutionSourceForEvent } from "../hook-resolution-source";

function DetailField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | number | undefined;
}) {
  return (
    <div>
      <Text className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </Text>
      <Text className="text-sm">{value ?? "—"}</Text>
    </div>
  );
}

export function HookExecutionDebugDetail({
  event,
}: {
  readonly event: DebugEvent;
}) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;
  const summary = event.summary;
  const writesSummary = formatHookExecutionWritesSummary({
    writesCreated:
      typeof summary?.writesCreated === "number" ? summary.writesCreated : 0,
    writesUpdated:
      typeof summary?.writesUpdated === "number" ? summary.writesUpdated : 0,
    writesDeleted:
      typeof summary?.writesDeleted === "number" ? summary.writesDeleted : 0,
  });
  const actionTrace = Array.isArray(summary?.actionTrace)
    ? summary.actionTrace
    : Array.isArray(payload?.actionTrace)
      ? payload.actionTrace
      : [];
  const resolutionSource = resolutionSourceForEvent(event);
  const writesByEntity =
    summary?.writesByEntity && typeof summary.writesByEntity === "object"
      ? (summary.writesByEntity as Record<
          string,
          { created?: number; updated?: number; deleted?: number }
        >)
      : null;

  return (
    <div className="space-y-4">
      {resolutionSource ? (
        <div className="flex flex-wrap items-center gap-2">
          <Text className="text-muted-foreground text-xs font-medium uppercase">
            {t("debugger.detail.resolutionSource")}
          </Text>
          <DebuggerResolutionBadge resolutionSource={resolutionSource} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label={t("debugger.detail.entity")}
          value={String(payload?.entityName ?? summary?.entityName ?? "")}
        />
        <DetailField
          label={t("debugger.detail.hook")}
          value={String(payload?.hookName ?? summary?.hookName ?? "")}
        />
        <DetailField
          label={t("debugger.detail.event")}
          value={String(payload?.event ?? summary?.event ?? "")}
        />
        <DetailField
          label={t("debugger.detail.recordId")}
          value={String(payload?.recordId ?? summary?.recordId ?? "")}
        />
        <DetailField
          label={t("debugger.detail.phase")}
          value={String(payload?.phase ?? summary?.phase ?? "")}
        />
        <DetailField
          label={t("debugger.detail.operation")}
          value={String(payload?.operation ?? summary?.operation ?? "")}
        />
        <DetailField
          label={t("debugger.detail.executionMode")}
          value={String(payload?.executionMode ?? summary?.executionMode ?? "")}
        />
        <DetailField
          label={t("debugger.detail.chainDepth")}
          value={
            typeof (payload?.chainDepth ?? summary?.chainDepth) === "number"
              ? String(payload?.chainDepth ?? summary?.chainDepth)
              : undefined
          }
        />
        <DetailField
          label={t("debugger.detail.startedAt")}
          value={String(payload?.startedAt ?? "")}
        />
        <DetailField
          label={t("debugger.detail.finishedAt")}
          value={
            payload?.finishedAt != null
              ? String(payload.finishedAt)
              : event.status === "running" || event.status === "pending"
                ? t("debugger.detail.inProgress")
                : undefined
          }
        />
        <DetailField
          label={t("debugger.detail.duration")}
          value={
            payload?.durationMs != null
              ? `${String(payload.durationMs)}ms`
              : event.status === "running" || event.status === "pending"
                ? t("debugger.detail.inProgress")
                : undefined
          }
        />
        <DetailField
          label={t("debugger.detail.writesCreated")}
          value={
            typeof (payload?.writesCreated ?? summary?.writesCreated) ===
            "number"
              ? String(payload?.writesCreated ?? summary?.writesCreated)
              : undefined
          }
        />
        <DetailField
          label={t("debugger.detail.writesUpdated")}
          value={
            typeof (payload?.writesUpdated ?? summary?.writesUpdated) ===
            "number"
              ? String(payload?.writesUpdated ?? summary?.writesUpdated)
              : undefined
          }
        />
        <DetailField
          label={t("debugger.detail.writesDeleted")}
          value={
            typeof (payload?.writesDeleted ?? summary?.writesDeleted) ===
            "number"
              ? String(payload?.writesDeleted ?? summary?.writesDeleted)
              : undefined
          }
        />
      </div>

      {writesSummary ? (
        <Text className="text-sm font-medium">{writesSummary}</Text>
      ) : null}

      {typeof payload?.error === "string" && payload.error.length > 0 ? (
        <Alert>{payload.error}</Alert>
      ) : null}

      {writesByEntity && Object.keys(writesByEntity).length > 0 ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.writesByEntity")}</Heading>
          <DebuggerJsonBlock value={writesByEntity} />
        </section>
      ) : null}

      {actionTrace.length > 0 ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.actionTrace")}</Heading>
          <DebuggerJsonBlock value={actionTrace} />
        </section>
      ) : null}

      {event.payload ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.rawRecord")}</Heading>
          <DebuggerJsonBlock value={event.payload} />
        </section>
      ) : null}
    </div>
  );
}
