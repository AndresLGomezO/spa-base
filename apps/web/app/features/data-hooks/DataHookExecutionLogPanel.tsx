import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "@repo/ui";
import type { DataHookExecutionRecord } from "@repo/hooks";

import { listDataHookExecutions } from "../../lib/api-client";

export function DataHookExecutionLogPanel({
  hookId,
}: {
  readonly hookId: string;
}) {
  const { t } = useTranslation("common");
  const [items, setItems] = useState<readonly DataHookExecutionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listDataHookExecutions(hookId)
      .then((response) => {
        if (!cancelled) {
          setItems(response.items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t("dataHooks.executionLog.error"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hookId, t]);

  if (loading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("dataHooks.executionLog.loading")}
      </Text>
    );
  }

  if (error) {
    return <Text className="text-destructive text-sm">{error}</Text>;
  }

  if (items.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("dataHooks.executionLog.empty")}
      </Text>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">
              {t("dataHooks.executionLog.status")}
            </th>
            <th className="px-3 py-2 font-medium">
              {t("dataHooks.executionLog.startedAt")}
            </th>
            <th className="px-3 py-2 font-medium">
              {t("dataHooks.executionLog.duration")}
            </th>
            <th className="px-3 py-2 font-medium">
              {t("dataHooks.executionLog.errorColumn")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="px-3 py-2">{item.status}</td>
              <td className="px-3 py-2">{item.startedAt}</td>
              <td className="px-3 py-2">{item.durationMs}ms</td>
              <td className="text-muted-foreground px-3 py-2">
                {item.error ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
