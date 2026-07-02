import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Text } from "@repo/ui";

import type {
  IndexProvisioningLogEntry,
  IndexProvisioningLogLevel,
} from "../../../lib/api-client";

function LogLevelIcon({
  level,
}: {
  readonly level: IndexProvisioningLogLevel;
}) {
  switch (level) {
    case "success":
      return (
        <CheckCircle2 className="text-success size-3.5 shrink-0" aria-hidden />
      );
    case "error":
      return (
        <AlertTriangle
          className="text-destructive size-3.5 shrink-0"
          aria-hidden
        />
      );
    case "warning":
      return (
        <AlertTriangle className="text-warning size-3.5 shrink-0" aria-hidden />
      );
    default:
      return <Info className="text-info size-3.5 shrink-0" aria-hidden />;
  }
}

export function IndexProvisioningLogTimeline({
  entries,
}: {
  readonly entries: readonly IndexProvisioningLogEntry[];
}) {
  const { t } = useTranslation("common");

  if (entries.length === 0) {
    return (
      <Text className="text-muted-foreground text-xs">
        {t("indexProvisioning.processList.noLogEntries")}
      </Text>
    );
  }

  return (
    <ol className="space-y-2 border-l border-dashed pl-3">
      {entries.map((entry, index) => (
        <li
          key={`${entry.timestamp}-${entry.event}-${index}`}
          className="space-y-1"
        >
          <div className="flex items-start gap-2">
            <LogLevelIcon level={entry.level} />
            <div className="min-w-0 flex-1">
              <Text className="text-xs font-medium">{entry.message}</Text>
              <Text className="text-muted-foreground text-[11px]">
                {new Date(entry.timestamp).toLocaleString()}
              </Text>
              {entry.detail ? (
                <Text className="text-destructive mt-1 text-xs whitespace-pre-wrap">
                  {entry.detail}
                </Text>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
