import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";

function DetailField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | undefined;
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

export function AuditDebugDetail({ event }: { readonly event: DebugEvent }) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label={t("debugger.detail.entity")}
          value={String(payload?.entity ?? "")}
        />
        <DetailField
          label={t("debugger.detail.recordId")}
          value={String(payload?.recordId ?? "")}
        />
        <DetailField
          label={t("debugger.detail.actor")}
          value={String(payload?.actorId ?? "")}
        />
        <DetailField
          label={t("debugger.detail.targetUser")}
          value={
            payload?.targetUserId != null
              ? String(payload.targetUserId)
              : undefined
          }
        />
      </div>

      {payload?.metadata ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.metadata")}</Heading>
          <DebuggerJsonBlock value={payload.metadata} />
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
