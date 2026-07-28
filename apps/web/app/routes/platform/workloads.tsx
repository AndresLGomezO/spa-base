import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { PlatformWorkloadsPanel } from "../../components/platform/PlatformWorkloadsPanel";

export default function PlatformWorkloadsRoute() {
  const { t } = useTranslation("common");

  return (
    <div className="min-w-0 w-full space-y-4">
      <div className="space-y-2">
        <Heading level={1}>{t("platform.workloads.title")}</Heading>
        <Text>{t("platform.workloads.description")}</Text>
      </div>
      <PlatformWorkloadsPanel />
    </div>
  );
}
