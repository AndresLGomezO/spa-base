import { Alert, Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import { DebuggerTextBlock } from "../components/DebuggerTextBlock";

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

function readSummaryString(
  summary: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = summary?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function HookLogDebugDetail({ event }: { readonly event: DebugEvent }) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;
  const summary = event.summary;
  const message =
    readSummaryString(summary, "message") ??
    (event.title.trim().length > 0 ? event.title : undefined);
  const error = readSummaryString(summary, "error");

  return (
    <div className="space-y-4">
      {message ? <DebuggerTextBlock value={message} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label={t("debugger.detail.hook")}
          value={readSummaryString(summary, "hookName")}
        />
        <DetailField
          label={t("debugger.detail.entity")}
          value={readSummaryString(summary, "entityName")}
        />
        <DetailField
          label={t("debugger.detail.event")}
          value={readSummaryString(summary, "event")}
        />
        <DetailField
          label={t("debugger.detail.recordId")}
          value={readSummaryString(summary, "recordId")}
        />
        <DetailField
          label={t("debugger.detail.level")}
          value={readSummaryString(summary, "level")}
        />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {payload?.meta ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.metadata")}</Heading>
          <DebuggerJsonBlock value={payload.meta} />
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
