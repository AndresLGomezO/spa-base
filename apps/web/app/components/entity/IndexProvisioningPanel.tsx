import { useEffect, useMemo, useState } from "react";
import { Alert, Heading, Spinner, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type {
  IndexProvisioningStatusSummary,
  IndexStatusRecord,
} from "../../lib/api-client";

const TIP_ROTATION_MS = 6_000;

const INDEX_TIP_KEYS = [
  "indexes.tips.tip1",
  "indexes.tips.tip2",
  "indexes.tips.tip3",
  "indexes.tips.tip4",
] as const;

function extractFirebaseIndexUrl(
  message: string | null | undefined,
): string | null {
  if (!message) {
    return null;
  }
  const match = message.match(/https:\/\/[^\s)]+/);
  return match?.[0] ?? null;
}

interface IndexProvisioningPanelProps {
  readonly entityLabel: string;
  readonly phase: "building" | "error";
  readonly summary?: IndexProvisioningStatusSummary;
  readonly listErrorMessage?: string | null;
}

export function IndexProvisioningPanel({
  entityLabel,
  phase,
  summary,
  listErrorMessage,
}: IndexProvisioningPanelProps) {
  const { t } = useTranslation("common");
  const tipMessages = useMemo(() => INDEX_TIP_KEYS.map((key) => t(key)), [t]);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (phase !== "building" || tipMessages.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % tipMessages.length);
    }, TIP_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [phase, tipMessages.length]);

  const firebaseUrl = extractFirebaseIndexUrl(listErrorMessage);
  const errorRecords =
    summary?.records.filter((record) => record.status === "ERROR") ?? [];

  if (phase === "building") {
    return (
      <div
        className="border-border bg-muted/40 flex flex-col items-center gap-4 rounded-lg border px-6 py-10 text-center"
        role="status"
        aria-live="polite"
      >
        <Spinner size="lg" ariaLabel={t("indexes.buildingSpinnerLabel")} />
        <div className="flex max-w-lg flex-col gap-2">
          <Heading level={2}>
            {t("indexes.buildingTitle", { entity: entityLabel })}
          </Heading>
          <Text className="text-muted-foreground">
            {t("indexes.buildingSubtitle")}
          </Text>
          {tipMessages.length > 0 ? (
            <Text className="text-muted-foreground text-sm italic">
              {tipMessages[tipIndex]}
            </Text>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" role="alert" aria-live="assertive">
      <Alert className="border-destructive/50 bg-destructive/5">
        <Heading level={3}>
          {t("indexes.errorTitle", { entity: entityLabel })}
        </Heading>
        <Text className="text-muted-foreground mt-2">
          {t("indexes.errorSubtitle")}
        </Text>
        {errorRecords.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {errorRecords.map((record) => (
              <IndexErrorListItem key={record.signature} record={record} />
            ))}
          </ul>
        ) : null}
        <Text className="mt-4 font-medium">
          {t("indexes.errorNextStepsTitle")}
        </Text>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>{t("indexes.errorStepRetry")}</li>
          <li>{t("indexes.errorStepWait")}</li>
          {firebaseUrl ? (
            <li>
              <a
                href={firebaseUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                {t("indexes.errorStepConsole")}
              </a>
            </li>
          ) : (
            <li>{t("indexes.errorStepConsoleGeneric")}</li>
          )}
          <li>{t("indexes.errorStepModel")}</li>
        </ul>
      </Alert>
    </div>
  );
}

function IndexErrorListItem({
  record,
}: {
  readonly record: IndexStatusRecord;
}) {
  return (
    <li>
      <span className="font-mono text-xs">{record.signature}</span>
      {record.errorMessage ? (
        <span className="text-muted-foreground"> — {record.errorMessage}</span>
      ) : null}
    </li>
  );
}
