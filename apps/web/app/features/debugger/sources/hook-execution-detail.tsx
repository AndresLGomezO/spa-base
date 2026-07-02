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

export function HookExecutionDebugDetail({
  event,
}: {
  readonly event: DebugEvent;
}) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label={t("debugger.detail.entity")}
          value={String(payload?.entityName ?? "")}
        />
        <DetailField
          label={t("debugger.detail.hook")}
          value={String(payload?.hookName ?? "")}
        />
        <DetailField
          label={t("debugger.detail.event")}
          value={String(payload?.event ?? "")}
        />
        <DetailField
          label={t("debugger.detail.phase")}
          value={String(payload?.phase ?? "")}
        />
        <DetailField
          label={t("debugger.detail.operation")}
          value={String(payload?.operation ?? "")}
        />
        <DetailField
          label={t("debugger.detail.duration")}
          value={
            payload?.durationMs != null
              ? `${String(payload.durationMs)}ms`
              : undefined
          }
        />
      </div>

      {typeof payload?.error === "string" && payload.error.length > 0 ? (
        <Alert>{payload.error}</Alert>
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
