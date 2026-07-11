import type { ReactNode } from "react";
import { toast } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  CompositionScope,
  DesignSurface,
  UiLayoutDocument,
} from "@repo/ui-builder-core";

import { createBuilderScopeAdapter } from "./BuilderScopeAdapter";
import { UnifiedBuilderShell } from "./UnifiedBuilderShell";

interface UnifiedDesignerLayoutTabProps {
  readonly scope: CompositionScope;
  readonly designSurface: DesignSurface;
  readonly layout: UiLayoutDocument;
  readonly setLayout: (layout: UiLayoutDocument) => void;
  readonly canSave: boolean;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly onSave: () => Promise<string | null>;
  readonly treePanel: ReactNode;
  readonly previewPanel: ReactNode;
  readonly sessionWrapper?: (workbench: ReactNode) => ReactNode;
  readonly showSaveButton?: boolean;
  readonly toolbarStart?: ReactNode;
}

export function UnifiedDesignerLayoutTab({
  scope,
  designSurface,
  layout,
  setLayout,
  canSave,
  isDirty,
  isSaving,
  onSave,
  treePanel,
  previewPanel,
  sessionWrapper,
  showSaveButton,
  toolbarStart,
}: UnifiedDesignerLayoutTabProps) {
  const { t } = useTranslation("common");

  const adapter = useMemo(
    () =>
      createBuilderScopeAdapter({
        scope,
        designSurface,
        layout,
        setLayout,
        createRenderContext: () => ({
          mode: "mainPage",
          data: {},
          locale: "en",
          resolveField: () => undefined,
        }),
        treePanel,
        previewPanel,
      }),
    [designSurface, layout, previewPanel, scope, setLayout, treePanel],
  );

  const handleSave = async () => {
    if (!canSave || !isDirty) {
      return;
    }

    const error = await onSave();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <UnifiedBuilderShell
      adapter={adapter}
      canSave={canSave}
      isDirty={isDirty}
      isSaving={isSaving}
      onSave={handleSave}
      sessionWrapper={sessionWrapper}
      showSaveButton={showSaveButton}
      toolbarStart={toolbarStart}
    />
  );
}
