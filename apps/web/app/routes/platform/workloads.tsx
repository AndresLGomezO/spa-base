import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { PlatformWorkloadsPanel } from "../../components/platform/PlatformWorkloadsPanel";

export default function PlatformWorkloadsRoute() {
  const { t } = useTranslation("common");

  return (
    <BuilderPageShell
      title={t("platform.workloads.title")}
      subtitle={t("platform.workloads.description")}
      bodyScrollable={false}
    >
      <PlatformWorkloadsPanel />
    </BuilderPageShell>
  );
}
