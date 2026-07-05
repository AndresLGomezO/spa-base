import { useTranslation } from "react-i18next";

import { getEntityLabel } from "../../entities/entity-catalog";
import { DesignedEntityFormModal } from "../../components/forms/DesignedEntityFormModal";
import { DesignerPreviewPanelShell } from "../ui-builder/DesignerPreviewPanelShell";
import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import type { FormDesignerTabId } from "./form-designer-tabs";
import { FormDesignerMobileDeviceSelect } from "./FormDesignerMobileDeviceSelect";
import { MobileDevicePreviewFrame } from "./MobileDevicePreviewFrame";
import { FormDesignerPreviewThemeScope } from "./FormDesignerPreviewThemeScope";
import { FormDesignerPreviewThemeSelect } from "./FormDesignerPreviewThemeSelect";
import {
  FormDesignerLayoutColumnHoverProvider,
  useFormDesignerLayoutColumnHover,
} from "./FormDesignerLayoutColumnHover";
import { FormDesignerComponentsPreviewBody } from "./FormDesignerComponentsPreviewBody";
import { useOptionalFormDesignerComponentsSession } from "./FormDesignerComponentsSession";
import { FormDesignerProductionPreviewBody } from "./FormDesignerProductionPreviewContent";
import { useFormDesigner } from "./form-designer-context";
import { resolveMobilePreviewDevice } from "./mobile-preview-device-presets";

interface FormDesignerPreviewPanelProps {
  readonly previewTabId: FormDesignerTabId;
  readonly showCard?: boolean;
}

function FormDesignerPreviewPanelContent({
  previewTabId,
  showCard = false,
}: FormDesignerPreviewPanelProps) {
  const { t } = useTranslation("common");
  const {
    editor,
    preview,
    previewBreakpoint,
    previewMobileDeviceId,
    previewColorScheme,
  } = useFormDesigner();
  const entityLabel = getEntityLabel(editor.definition);
  const columnHover = useFormDesignerLayoutColumnHover();
  const componentsSession = useOptionalFormDesignerComponentsSession();
  const hoveredColumnIndex = columnHover?.hoveredColumnIndex ?? null;
  const hasComponentRowFocus = componentsSession?.resolvedRowFocus != null;
  const hasComponentColumnFocus =
    componentsSession?.resolvedColumnFocus != null;
  const componentsTreeScope = componentsSession?.treeScope;
  const showComponentsModalFooter =
    previewTabId !== "design" ||
    componentsTreeScope === "shell" ||
    componentsTreeScope === "main";

  const hasColumnFocus = hoveredColumnIndex !== null;

  const dimFooter =
    previewTabId === "design" &&
    (hasColumnFocus || hasComponentRowFocus || hasComponentColumnFocus);

  const resolvedModalFooter = showComponentsModalFooter
    ? preview.previewFooter
    : undefined;

  const modalFooter =
    resolvedModalFooter && dimFooter ? (
      <div className="pointer-events-none opacity-30 saturate-0 select-none">
        {resolvedModalFooter}
      </div>
    ) : (
      resolvedModalFooter
    );

  const mobilePreviewDevice =
    previewBreakpoint === "base"
      ? resolveMobilePreviewDevice(previewMobileDeviceId)
      : null;
  const simulateMobileViewport = mobilePreviewDevice != null;
  const isWizardMobilePreview =
    simulateMobileViewport && editor.presentation === "wizard";

  const modalContent =
    previewTabId === "design" ? (
      <FormDesignerComponentsPreviewBody />
    ) : (
      <FormDesignerProductionPreviewBody
        simulateMobileViewport={simulateMobileViewport}
      />
    );

  const useDesignerFillLayout = showCard;

  const inlineFormPreview = (
    <DesignedEntityFormModal
      variant="inline"
      open
      scrollable={
        useDesignerFillLayout
          ? false
          : previewTabId === "design"
            ? editor.presentation !== "wizard" &&
              preview.previewContentPadding !== "none"
            : preview.previewFormScrollable
      }
      embeddedLayout={
        useDesignerFillLayout || simulateMobileViewport ? "fill" : undefined
      }
      panelMaxHeight={useDesignerFillLayout ? "none" : undefined}
      onClose={() => undefined}
      title={t("entity.createTitle", { entity: entityLabel })}
      forms={{
        modalSize: editor.modalSize,
        modalSizeByBreakpoint: editor.modalSizeByBreakpoint,
      }}
      simulatedBreakpoint={previewBreakpoint}
      showHeader={preview.showHeader}
      showCloseButton={preview.showHeader}
      contentPadding={preview.previewContentPadding}
      footer={modalFooter}
    >
      {isWizardMobilePreview ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          {modalContent}
        </div>
      ) : (
        modalContent
      )}
    </DesignedEntityFormModal>
  );

  const viewport = mobilePreviewDevice ? (
    <MobileDevicePreviewFrame
      device={mobilePreviewDevice}
      breakpoint={previewBreakpoint}
      className="h-full"
      fillHeight={useDesignerFillLayout}
    >
      {inlineFormPreview}
    </MobileDevicePreviewFrame>
  ) : (
    <LayoutPreviewViewport
      breakpoint={previewBreakpoint}
      className="h-full"
      fillHeight={useDesignerFillLayout}
    >
      {inlineFormPreview}
    </LayoutPreviewViewport>
  );

  const themedViewport = (
    <FormDesignerPreviewThemeScope colorScheme={previewColorScheme}>
      {viewport}
    </FormDesignerPreviewThemeScope>
  );

  if (!showCard) {
    return themedViewport;
  }

  return (
    <DesignerPreviewPanelShell
      fillHeight
      controls={
        <>
          <FormDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <FormDesignerMobileDeviceSelect />
          ) : null}
        </>
      }
    >
      {themedViewport}
    </DesignerPreviewPanelShell>
  );
}

export function FormDesignerPreviewPanel(props: FormDesignerPreviewPanelProps) {
  if (props.previewTabId === "design") {
    return (
      <FormDesignerLayoutColumnHoverProvider>
        <FormDesignerPreviewPanelContent {...props} />
      </FormDesignerLayoutColumnHoverProvider>
    );
  }

  return <FormDesignerPreviewPanelContent {...props} />;
}
