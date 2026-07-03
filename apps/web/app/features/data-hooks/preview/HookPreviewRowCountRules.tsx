import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface HookPreviewRowCountRulesProps {
  readonly ruleKey: "initial" | "extension";
}

export function HookPreviewRowCountRules({
  ruleKey,
}: HookPreviewRowCountRulesProps) {
  const { t } = useTranslation("common");
  const bullets =
    ruleKey === "initial"
      ? [
          t("dataHooks.preview.rowCount.initial.oneTime"),
          t("dataHooks.preview.rowCount.initial.recurring"),
        ]
      : [
          t("dataHooks.preview.rowCount.extension.horizon"),
          t("dataHooks.preview.rowCount.extension.batch"),
        ];

  return (
    <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
      {bullets.map((line) => (
        <li key={line}>
          <Text className="text-muted-foreground text-xs">{line}</Text>
        </li>
      ))}
    </ul>
  );
}
