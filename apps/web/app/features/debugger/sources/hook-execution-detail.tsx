import { formatHookExecutionWritesSummary } from "@repo/hooks";
import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";

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

type ActionTraceStep = {
  readonly type?: unknown;
  readonly entity?: unknown;
  readonly as?: unknown;
  readonly outcome?: unknown;
  readonly matched?: unknown;
  readonly score?: unknown;
  readonly candidateCount?: unknown;
  readonly durationMs?: unknown;
  readonly count?: unknown;
  readonly error?: unknown;
};

function formatResolutionSource(
  value: unknown,
  t: (key: string) => string,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  const key = `debugger.detail.resolutionSources.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

function formatOutcome(
  value: unknown,
  t: (key: string) => string,
): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  const key = `debugger.detail.actionOutcome.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}

function ActionTraceSteps({
  steps,
}: {
  readonly steps: readonly ActionTraceStep[];
}) {
  const { t } = useTranslation("common");

  return (
    <ul className="divide-border border-border divide-y rounded-md border">
      {steps.map((step, index) => {
        const type = typeof step.type === "string" ? step.type : "action";
        const outcome = formatOutcome(step.outcome, t);
        const meta: string[] = [];
        if (typeof step.as === "string" && step.as.length > 0) {
          meta.push(`as=${step.as}`);
        }
        if (typeof step.entity === "string" && step.entity.length > 0) {
          meta.push(step.entity);
        }
        if (step.matched === true) {
          meta.push(t("debugger.detail.actionMatched"));
        }
        if (typeof step.score === "number" && Number.isFinite(step.score)) {
          meta.push(
            `${t("debugger.detail.actionScore")} ${step.score.toFixed(3)}`,
          );
        }
        if (
          typeof step.candidateCount === "number" &&
          Number.isFinite(step.candidateCount)
        ) {
          meta.push(
            `${t("debugger.detail.actionCandidates")} ${String(step.candidateCount)}`,
          );
        }
        if (typeof step.count === "number") {
          meta.push(`×${String(step.count)}`);
        }
        if (typeof step.durationMs === "number") {
          meta.push(`${String(step.durationMs)}ms`);
        }

        return (
          <li key={`${type}-${String(index)}`} className="space-y-1 px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Text className="text-sm font-medium">{type}</Text>
              {outcome ? (
                <Text className="text-muted-foreground text-xs uppercase">
                  {outcome}
                </Text>
              ) : null}
            </div>
            {meta.length > 0 ? (
              <Text className="text-muted-foreground text-xs">
                {meta.join(" · ")}
              </Text>
            ) : null}
            {typeof step.error === "string" && step.error.length > 0 ? (
              <Text className="text-destructive text-xs">{step.error}</Text>
            ) : null}
          </li>
        );
      })}
    </ul>
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
    ? (summary.actionTrace as ActionTraceStep[])
    : Array.isArray(payload?.actionTrace)
      ? (payload.actionTrace as ActionTraceStep[])
      : [];
  const resolutionSource = formatResolutionSource(
    payload?.resolutionSource ?? summary?.resolutionSource,
    t,
  );
  const writesByEntity =
    summary?.writesByEntity && typeof summary.writesByEntity === "object"
      ? (summary.writesByEntity as Record<
          string,
          { created?: number; updated?: number; deleted?: number }
        >)
      : null;

  return (
    <div className="space-y-4">
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
          label={t("debugger.detail.resolutionSource")}
          value={resolutionSource}
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
          <ActionTraceSteps steps={actionTrace} />
          <details className="space-y-2">
            <summary className="text-muted-foreground cursor-pointer text-xs">
              {t("debugger.detail.actionRawJson")}
            </summary>
            <DebuggerJsonBlock value={actionTrace} />
          </details>
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
