import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface StructurePanelComponentIdLabelProps {
  readonly id: string;
}

export function StructurePanelComponentIdLabel({
  id,
}: StructurePanelComponentIdLabelProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-0.5">
      <Text variant="muted" className="text-xs font-medium">
        {t("dashboardLayoutDesigner.structurePanelComponentId")}
      </Text>
      <code className="text-muted-foreground bg-muted/50 border-border/60 truncate rounded border px-2 py-1 font-mono text-xs">
        {id}
      </code>
    </div>
  );
}
