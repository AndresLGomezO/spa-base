import type { ReactNode } from "react";
import { Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  designerPreviewColumnClassName,
  designerPropertiesColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import type { BuilderScopeAdapter } from "./BuilderScopeAdapter";
import { PreviewContextProvider } from "./PreviewContextProvider";

interface UnifiedBuilderShellProps {
  readonly adapter: BuilderScopeAdapter;
  readonly canSave: boolean;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly onSave: () => void | Promise<void>;
  readonly sessionWrapper?: (workbench: ReactNode) => ReactNode;
  readonly showSaveButton?: boolean;
}

/**
 * Single editing surface: component tree + canvas preview (Section 15.7).
 */
export function UnifiedBuilderShell({
  adapter,
  canSave,
  isDirty,
  isSaving,
  onSave,
  sessionWrapper,
  showSaveButton = true,
}: UnifiedBuilderShellProps) {
  const { t } = useTranslation("common");

  const workbench = (
    <div className={designerTreeWorkbenchClassName}>
      {adapter.treePanel}
      <div className={designerPreviewColumnClassName}>
        {adapter.previewPanel}
      </div>
      {adapter.propertiesPanel ? (
        <aside
          aria-label={t("unifiedBuilder.properties.ariaLabel")}
          className={designerPropertiesColumnClassName}
        >
          {adapter.propertiesPanel}
        </aside>
      ) : null}
    </div>
  );

  return (
    <PreviewContextProvider strategy={adapter.previewContext.strategy}>
      <div className={designerTreeTabRootClassName}>
        {showSaveButton ? (
          <div className="flex shrink-0 justify-end">
            <Button
              type="button"
              className="shrink-0"
              loading={isSaving}
              disabled={!canSave || !isDirty}
              onClick={() => void onSave()}
            >
              {t("entity.viewSettings.save")}
            </Button>
          </div>
        ) : null}
        {sessionWrapper ? sessionWrapper(workbench) : workbench}
      </div>
    </PreviewContextProvider>
  );
}
