import { TabbedPanel } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { FormDesignerTabId } from "./form-designer-tabs";
import { useFormDesigner } from "./FormDesignerProvider";
import { FormDesignerSettingsTab } from "./FormDesignerSettingsTab";
import {
  FormDesignerComponentsTabPlaceholder,
  FormDesignerLayoutTabPlaceholder,
} from "./FormDesignerTabPlaceholders";
import { FormDesignerUnsavedChangesModal } from "./FormDesignerUnsavedChangesModal";

export function FormDesignerTabs() {
  const { t } = useTranslation("common");
  const { activeTabId, requestTabChange } = useFormDesigner();

  const tabs = useMemo(
    () => [
      {
        id: "settings" as const,
        label: t("formDesigner.tabs.settings"),
        panel: <FormDesignerSettingsTab />,
      },
      {
        id: "layout" as const,
        label: t("formDesigner.tabs.layout"),
        panel: <FormDesignerLayoutTabPlaceholder />,
      },
      {
        id: "components" as const,
        label: t("formDesigner.tabs.components"),
        panel: <FormDesignerComponentsTabPlaceholder />,
      },
    ],
    [t],
  );

  return (
    <>
      <TabbedPanel
        ariaLabel={t("formDesigner.tabs.ariaLabel")}
        activeTabId={activeTabId}
        onTabChange={(tabId) => requestTabChange(tabId as FormDesignerTabId)}
        tabs={tabs}
      />
      <FormDesignerUnsavedChangesModal />
    </>
  );
}
