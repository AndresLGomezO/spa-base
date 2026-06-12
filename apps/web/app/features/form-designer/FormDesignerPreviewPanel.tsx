import { Text } from "@repo/ui";
import {
  moveRootColumn,
  removeRootColumn,
  type ColumnNode,
} from "@repo/ui-builder-core";
import { useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { getEntityLabel } from "../../entities/entity-catalog";
import { DesignedEntityFormModal } from "../../components/forms/DesignedEntityFormModal";
import { LayoutPreviewViewport } from "../ui-builder/LayoutPreviewPanel";
import type { FormDesignerTabId } from "./form-designer-tabs";
import { FormDesignerColumnChrome } from "./FormDesignerColumnChrome";
import { FormDesignerMobileDeviceSelect } from "./FormDesignerMobileDeviceSelect";
import { MobileDevicePreviewFrame } from "./MobileDevicePreviewFrame";
import { FormDesignerPreviewThemeScope } from "./FormDesignerPreviewThemeScope";
import { FormDesignerPreviewThemeSelect } from "./FormDesignerPreviewThemeSelect";
import { getFormDesignerOuterLayout } from "./form-designer-layout";
import { FormDesignerFormPreviewBody } from "./FormDesignerFormPreviewBody";
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
    requestLayoutColumnPanel,
    requestCloseLayoutColumnPanel,
    selectedLayoutColumnIndex,
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
    previewTabId !== "components" ||
    componentsTreeScope === "shell" ||
    componentsTreeScope === "main";

  const { layout, setLayout } = getFormDesignerOuterLayout(editor);

  const handleMoveLeft = useCallback(
    (columnIndex: number) => {
      setLayout(moveRootColumn(layout, columnIndex, -1));
    },
    [layout, setLayout],
  );

  const handleMoveRight = useCallback(
    (columnIndex: number) => {
      setLayout(moveRootColumn(layout, columnIndex, 1));
    },
    [layout, setLayout],
  );

  const handleDelete = useCallback(
    (columnIndex: number) => {
      if (selectedLayoutColumnIndex === columnIndex) {
        requestCloseLayoutColumnPanel();
      }
      setLayout(removeRootColumn(layout, columnIndex));
      columnHover?.setHoveredColumnIndex(null);
    },
    [
      columnHover,
      layout,
      requestCloseLayoutColumnPanel,
      selectedLayoutColumnIndex,
      setLayout,
    ],
  );

  const hasColumnFocus = hoveredColumnIndex !== null;

  const handleColumnHover = useCallback(
    (columnIndex: number | null) => {
      columnHover?.setHoveredColumnIndex(columnIndex);
    },
    [columnHover],
  );

  const rootColumnWrapper = useCallback(
    (index: number, column: ColumnNode, children: ReactNode) => (
      <FormDesignerColumnChrome
        key={column.id}
        columnIndex={index}
        column={column}
        columnCount={layout.root.columnCount}
        focusedColumnIndex={hoveredColumnIndex}
        onHover={handleColumnHover}
        onSelect={requestLayoutColumnPanel}
        onMoveLeft={handleMoveLeft}
        onMoveRight={handleMoveRight}
        onDelete={handleDelete}
      >
        {children}
      </FormDesignerColumnChrome>
    ),
    [
      handleColumnHover,
      handleDelete,
      handleMoveLeft,
      handleMoveRight,
      hoveredColumnIndex,
      layout.root.columnCount,
      requestLayoutColumnPanel,
    ],
  );

  const dimFooter =
    (previewTabId === "layout" && hasColumnFocus) ||
    (previewTabId === "components" &&
      (hasComponentRowFocus || hasComponentColumnFocus));

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
    previewTabId === "layout" ? (
      <FormDesignerFormPreviewBody
        rootColumnWrapper={rootColumnWrapper}
        simulateMobileViewport={simulateMobileViewport}
      />
    ) : previewTabId === "components" ? (
      <FormDesignerComponentsPreviewBody />
    ) : (
      <FormDesignerProductionPreviewBody
        simulateMobileViewport={simulateMobileViewport}
      />
    );

  const inlineFormPreview = (
    <DesignedEntityFormModal
      variant="inline"
      open
      scrollable={
        previewTabId === "components"
          ? editor.presentation !== "wizard" &&
            preview.previewContentPadding !== "none"
          : preview.previewFormScrollable
      }
      embeddedLayout={simulateMobileViewport ? "fill" : undefined}
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
    >
      {inlineFormPreview}
    </MobileDevicePreviewFrame>
  ) : (
    <LayoutPreviewViewport breakpoint={previewBreakpoint} className="h-full">
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
    <div className="bg-card border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Text className="text-muted-foreground text-sm">
          {t("entity.viewSettings.preview")}
        </Text>
        <div className="flex flex-wrap items-end gap-3">
          <FormDesignerPreviewThemeSelect />
          {previewBreakpoint === "base" ? (
            <FormDesignerMobileDeviceSelect />
          ) : null}
        </div>
      </div>
      <div className="min-h-96 overflow-auto py-2">{themedViewport}</div>
    </div>
  );
}

export function FormDesignerPreviewPanel(props: FormDesignerPreviewPanelProps) {
  if (props.previewTabId === "layout") {
    return (
      <FormDesignerLayoutColumnHoverProvider>
        <FormDesignerPreviewPanelContent {...props} />
      </FormDesignerLayoutColumnHoverProvider>
    );
  }

  return <FormDesignerPreviewPanelContent {...props} />;
}
