import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { PlatformObservabilityPanel } from "../../components/platform/PlatformObservabilityPanel";

export default function SettingsObservabilityRoute() {
  const { t } = useTranslation("common");

  return (
    <div className="min-w-0 w-full space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("platform.observability.title")}</Heading>
        <Text>{t("platform.observability.description")}</Text>
      </div>
      <PlatformObservabilityPanel />
    </div>
  );
}
