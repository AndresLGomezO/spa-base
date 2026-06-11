import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { FormModal } from "../../components/forms/FormModal";
import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import { useFormDesigner } from "./FormDesignerProvider";
import { useFormDesignerPreview } from "./use-form-designer-preview";

export function FormDesignerPreview() {
  const { t } = useTranslation("common");
  const { editor, previewBreakpoint, activeTabId } = useFormDesigner();
  const preview = useFormDesignerPreview(editor);

  if (activeTabId === "layout") {
    return (
      <div className="bg-card border-border flex flex-col gap-3 rounded-lg border p-4">
        <Text className="text-muted-foreground text-sm">
          {t("entity.viewSettings.preview")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("formDesigner.tabs.layoutPreviewPlaceholder")}
        </Text>
      </div>
    );
  }

  if (activeTabId === "components") {
    return (
      <div className="bg-card border-border flex flex-col gap-3 rounded-lg border p-4">
        <Text className="text-muted-foreground text-sm">
          {t("entity.viewSettings.preview")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("formDesigner.tabs.componentsPreviewPlaceholder")}
        </Text>
      </div>
    );
  }

  return (
    <div className="bg-card border-border flex flex-col gap-3 rounded-lg border p-4">
      <Text className="text-muted-foreground text-sm">
        {t("entity.viewSettings.preview")}
      </Text>
      <div className="min-h-96">
        <LayoutPreviewViewport
          breakpoint={previewBreakpoint}
          className="h-full"
        >
          <FormModal
            variant="inline"
            open
            scrollable={preview.previewFormScrollable}
            onClose={() => undefined}
            title={t("entity.viewSettings.preview")}
            size={preview.modalSize}
            showHeader={preview.showHeader}
            showCloseButton={false}
            contentPadding={preview.previewContentPadding}
            footer={preview.previewFooter}
          >
            {preview.formPreviewContent}
          </FormModal>
        </LayoutPreviewViewport>
      </div>
    </div>
  );
}
