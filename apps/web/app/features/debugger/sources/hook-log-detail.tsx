import { Heading } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import { DebuggerTextBlock } from "../components/DebuggerTextBlock";

export function HookLogDebugDetail({ event }: { readonly event: DebugEvent }) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
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
