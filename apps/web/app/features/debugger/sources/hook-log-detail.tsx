import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import { DebuggerStatusBadge } from "../components/DebuggerStatusBadge";
import { DebuggerTextBlock } from "../components/DebuggerTextBlock";

export function HookLogDebugDetail({ event }: { readonly event: DebugEvent }) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <div>
        <Heading level={2}>{t("debugger.sources.hookLog")}</Heading>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DebuggerStatusBadge status={event.status} />
          <Text className="text-muted-foreground text-sm">
            {event.timestamp}
          </Text>
        </div>
      </div>

      <DebuggerTextBlock value={event.title} />

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
