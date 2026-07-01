import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import { DebuggerStatusBadge } from "../components/DebuggerStatusBadge";

function TimingBar({
  label,
  value,
  total,
}: {
  readonly label: string;
  readonly value: number;
  readonly total: number;
}) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}ms</span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function RequestPerfDebugDetail({
  event,
}: {
  readonly event: DebugEvent;
}) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;
  const totalMs = Number(payload?.totalMs ?? 0);
  const rbacMs = Number(payload?.rbacMs ?? 0);
  const queryMs = Number(payload?.queryMs ?? 0);
  const hooksMs = Number(payload?.hooksMs ?? 0);

  return (
    <div className="space-y-4">
      <div>
        <Heading level={2}>{event.title}</Heading>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DebuggerStatusBadge status={event.status} />
          <Text className="text-muted-foreground text-sm">
            {event.timestamp}
          </Text>
        </div>
      </div>

      <div className="space-y-3">
        <TimingBar
          label={t("debugger.detail.rbacMs")}
          value={rbacMs}
          total={totalMs}
        />
        <TimingBar
          label={t("debugger.detail.queryMs")}
          value={queryMs}
          total={totalMs}
        />
        <TimingBar
          label={t("debugger.detail.hooksMs")}
          value={hooksMs}
          total={totalMs}
        />
        <TimingBar
          label={t("debugger.detail.totalMs")}
          value={totalMs}
          total={totalMs}
        />
      </div>

      {event.payload ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.rawRecord")}</Heading>
          <DebuggerJsonBlock value={event.payload} />
        </section>
      ) : null}
    </div>
  );
}
