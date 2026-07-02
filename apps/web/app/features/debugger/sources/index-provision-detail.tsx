import { Heading } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { DebugEvent } from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";

export function IndexProvisionDebugDetail({
  event,
}: {
  readonly event: DebugEvent;
}) {
  const { t } = useTranslation("common");
  const payload = event.payload as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-2">
        <div>
          <dt className="text-muted-foreground">
            {t("debugger.detail.collection")}
          </dt>
          <dd>{String(payload?.collection ?? "—")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("debugger.detail.eventType")}
          </dt>
          <dd>{String(payload?.event ?? "—")}</dd>
        </div>
        {payload?.blockedOperation ? (
          <div>
            <dt className="text-muted-foreground">
              {t("debugger.detail.blockedOperation")}
            </dt>
            <dd>{String(payload.blockedOperation)}</dd>
          </div>
        ) : null}
        {payload?.trigger ? (
          <div>
            <dt className="text-muted-foreground">
              {t("debugger.detail.trigger")}
            </dt>
            <dd>{String(payload.trigger)}</dd>
          </div>
        ) : null}
        {payload?.signature ? (
          <div>
            <dt className="text-muted-foreground">
              {t("debugger.detail.signature")}
            </dt>
            <dd className="font-mono text-xs">{String(payload.signature)}</dd>
          </div>
        ) : null}
        {payload?.errorMessage ? (
          <div>
            <dt className="text-muted-foreground">
              {t("debugger.detail.errorMessage")}
            </dt>
            <dd>{String(payload.errorMessage)}</dd>
          </div>
        ) : null}
      </dl>

      {event.payload ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.rawRecord")}</Heading>
          <DebuggerJsonBlock value={event.payload} />
        </section>
      ) : null}
    </div>
  );
}
