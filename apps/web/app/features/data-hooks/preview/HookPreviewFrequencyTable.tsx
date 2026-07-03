import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

const FREQUENCY_ROWS = [
  { key: "WEEKLY", scheduleKey: "weekly" },
  { key: "BIWEEKLY", scheduleKey: "biweekly" },
  { key: "MONTHLY", scheduleKey: "monthly" },
  { key: "QUARTERLY", scheduleKey: "quarterly" },
  { key: "ANNUAL", scheduleKey: "annual" },
] as const;

export function HookPreviewFrequencyTable() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-2">
      <Text className="text-foreground text-xs font-medium">
        {t("dataHooks.preview.frequencyTable.title")}
      </Text>
      <div className="border-border overflow-hidden rounded-md border text-xs">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                {t("dataHooks.preview.frequencyTable.frequency")}
              </th>
              <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                {t("dataHooks.preview.frequencyTable.schedule")}
              </th>
            </tr>
          </thead>
          <tbody>
            {FREQUENCY_ROWS.map((row) => (
              <tr key={row.key} className="border-border border-t">
                <td className="px-3 py-2 font-medium">
                  {t(`dataHooks.preview.frequencyTable.labels.${row.key}`)}
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {t(
                    `dataHooks.preview.frequencyTable.schedules.${row.scheduleKey}`,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Text className="text-muted-foreground text-xs">
        {t("dataHooks.preview.frequencyTable.example")}
      </Text>
    </div>
  );
}
