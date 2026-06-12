import {
  Button,
  SegmentedSwitch,
  Switch,
  toast,
  type SegmentedSwitchOption,
} from "@repo/ui";
import type { FormModalSize, FormPresentation } from "@repo/entities";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useFormDesigner } from "./form-designer-context";
import { FormDesignerPreview } from "./FormDesignerPreview";

const MODAL_SIZE_LABEL_KEY: Record<
  FormModalSize,
  | "designLayout.formModalSizeSm"
  | "designLayout.formModalSizeMd"
  | "designLayout.formModalSizeLg"
  | "designLayout.formModalSizeXl"
  | "designLayout.formModalSize2xl"
> = {
  sm: "designLayout.formModalSizeSm",
  md: "designLayout.formModalSizeMd",
  lg: "designLayout.formModalSizeLg",
  xl: "designLayout.formModalSizeXl",
  "2xl": "designLayout.formModalSize2xl",
};

const PREVIEW_BREAKPOINT_LABEL_KEY = {
  base: "formDesigner.previewBreakpoints.base",
  sm: "formDesigner.previewBreakpoints.sm",
  md: "formDesigner.previewBreakpoints.md",
  lg: "formDesigner.previewBreakpoints.lg",
  xl: "formDesigner.previewBreakpoints.xl",
  full: "formDesigner.previewBreakpoints.full",
} as const;

export function FormDesignerSettingsTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, settingsIsDirty, saveSettings, previewBreakpoint } =
    useFormDesigner();

  const presentationOptions = useMemo(
    (): readonly SegmentedSwitchOption<FormPresentation>[] => [
      {
        value: "plain",
        label: t("designLayout.formPresentationPlain"),
        ariaLabel: t("designLayout.formPresentationPlain"),
      },
      {
        value: "wizard",
        label: t("designLayout.formPresentationWizard"),
        ariaLabel: t("designLayout.formPresentationWizard"),
      },
    ],
    [t],
  );

  const modalSizeOptions = useMemo(
    (): readonly SegmentedSwitchOption<FormModalSize>[] => [
      {
        value: "sm",
        label: t("designLayout.formModalSizeSm"),
        ariaLabel: t("designLayout.formModalSizeSm"),
      },
      {
        value: "md",
        label: t("designLayout.formModalSizeMd"),
        ariaLabel: t("designLayout.formModalSizeMd"),
      },
      {
        value: "lg",
        label: t("designLayout.formModalSizeLg"),
        ariaLabel: t("designLayout.formModalSizeLg"),
      },
      {
        value: "xl",
        label: t("designLayout.formModalSizeXl"),
        ariaLabel: t("designLayout.formModalSizeXl"),
      },
      {
        value: "2xl",
        label: t("designLayout.formModalSize2xl"),
        ariaLabel: t("designLayout.formModalSize2xl"),
      },
    ],
    [t],
  );

  const handleSave = async () => {
    if (!canSave || !settingsIsDirty) {
      return;
    }

    const error = await saveSettings();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            {t("designLayout.presentation")}
          </span>
          <SegmentedSwitch
            value={editor.presentation}
            options={presentationOptions}
            onChange={(value) => editor.setPresentation(value)}
            ariaLabel={t("designLayout.presentation")}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            {t("designLayout.formModalSize")}
          </span>
          <SegmentedSwitch
            value={editor.getResolvedModalSizeAtBreakpoint(previewBreakpoint)}
            options={modalSizeOptions}
            onChange={(value) =>
              editor.setModalSizeForPreviewBreakpoint(previewBreakpoint, value)
            }
            ariaLabel={t("designLayout.formModalSize")}
          />
          {editor.isModalSizeExplicitAtBreakpoint(previewBreakpoint) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto self-start px-0 py-0 text-xs"
              onClick={() => editor.clearModalSizeOverride(previewBreakpoint)}
            >
              {t("designLayout.formModalSizeResetOverride")}
            </Button>
          ) : editor.getModalSizeInheritanceSource(previewBreakpoint) ? (
            <span className="text-muted-foreground text-xs">
              {t("designLayout.formModalSizeInherited", {
                size: t(
                  MODAL_SIZE_LABEL_KEY[
                    editor.getResolvedModalSizeAtBreakpoint(previewBreakpoint)
                  ],
                ),
                breakpoint: t(
                  PREVIEW_BREAKPOINT_LABEL_KEY[
                    editor.getModalSizeInheritanceSource(previewBreakpoint)!
                  ],
                ),
              })}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          className="ml-auto"
          loading={editor.isSaving}
          disabled={!canSave || !settingsIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <div className="bg-muted/30 border-border flex flex-wrap items-center gap-4 rounded-lg border border-dashed p-4">
        <Switch
          variant="ios"
          checked={editor.modalChrome.showHeader ?? true}
          onChange={(checked) => editor.setShowModalHeader(checked)}
          label={t("designLayout.formModalShowHeader")}
        />
        <Switch
          variant="ios"
          checked={editor.modalChrome.contentPadding === "none"}
          onChange={(checked) => editor.setFlushModalContent(checked)}
          label={t("designLayout.formModalFlushContent")}
        />
        <Switch
          variant="ios"
          checked={editor.modalFooterLayout != null}
          onChange={(checked) => {
            if (checked) {
              editor.enableModalFooterLayout();
            } else {
              editor.disableModalFooterLayout();
            }
          }}
          label={t("designLayout.formModalFooterDedicated")}
        />
      </div>

      <FormDesignerPreview />
    </div>
  );
}
