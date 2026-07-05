import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FileDown,
  FileJson,
  FileUp,
  LayoutTemplate,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  InsertPresetDialog,
  LayoutJsonImportDialog,
  LayoutJsonViewDialog,
  SavePresetDialog,
} from "@repo/ui-builder-react";
import {
  replaceComponentRowAt,
  type ComponentRowNode,
} from "@repo/ui-builder-core";
import { IconButton, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  useEntityDefinition,
  useEntityCatalog,
} from "../../entities/entity-catalog-context";
import { entityCardViewAdapter } from "@repo/ui-builder-react";
import { useUiBuilderPresetStore } from "../ui-builder/use-ui-builder-preset-store";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { findRowByRef } from "../form-designer/form-designer-components-layout";
import { resolveLayoutBinding } from "./detail-view-designer-layout-binding";
import { useDetailViewDesigner } from "./detail-view-designer-context";

function ToolAction({
  label,
  icon,
  onClick,
}: {
  readonly label: string;
  readonly icon: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted/60 flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors duration-150"
    >
      <span className="bg-background text-foreground ring-border/50 flex size-9 items-center justify-center rounded-lg shadow-sm ring-1">
        {icon}
      </span>
      <Text className="text-muted-foreground text-[10px] leading-none">
        {label}
      </Text>
    </button>
  );
}

interface DetailViewDesignerComponentRowPanelHeaderMenuProps {
  readonly rowRef: ComponentRowRef;
}

export function DetailViewDesignerComponentRowPanelHeaderMenu({
  rowRef,
}: DetailViewDesignerComponentRowPanelHeaderMenuProps) {
  const { t } = useTranslation("common");
  const { editor } = useDetailViewDesigner();
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useFormDesignerLayoutEditorLabels();
  const presetStore = useUiBuilderPresetStore(definition.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

  const binding = useMemo(() => resolveLayoutBinding(editor), [editor]);

  const row = findRowByRef(binding.layout, rowRef);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenu, menuOpen]);

  if (!row) {
    return null;
  }

  const toolLabels = {
    insert: t("formDesigner.components.rowPanel.tools.insert"),
    save: t("formDesigner.components.rowPanel.tools.save"),
    view: t("formDesigner.components.rowPanel.tools.view"),
    import: t("formDesigner.components.rowPanel.tools.import"),
    gear: t("formDesigner.components.rowPanel.tools.gear"),
  };

  const renderIconTrigger =
    (label: string, icon: ReactNode) =>
    ({ open }: { open: () => void }) => (
      <ToolAction
        label={label}
        icon={icon}
        onClick={() => {
          closeMenu();
          open();
        }}
      />
    );

  const jsonScope = { type: "component-row" as const };

  const jsonData = row;
  const presetKind = "component-row" as const;

  return (
    <div ref={rootRef} className="relative flex items-center">
      <div
        className={cn(
          "flex items-center gap-1 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out",
          menuOpen
            ? "max-w-56 translate-x-0 opacity-100"
            : "pointer-events-none max-w-0 translate-x-2 opacity-0",
        )}
      >
        <div className="bg-muted/40 ring-border/40 flex items-center gap-0.5 rounded-lg px-1 py-0.5 shadow-sm ring-1">
          <InsertPresetDialog
            kind={presetKind}
            designSurface="recordDetail"
            definition={definition}
            fieldDescriptors={fieldDescriptors}
            presets={presetStore.presets}
            canApply={presetStore.canApplyPresets}
            labels={presetStore.presetInsertLabels}
            onApply={() => undefined}
            renderTrigger={renderIconTrigger(
              toolLabels.insert,
              <LayoutTemplate className="size-4" />,
            )}
          />
          <SavePresetDialog
            kind={presetKind}
            node={jsonData as ComponentRowNode}
            designSurface="recordDetail"
            sourceEntityName={presetStore.sourceEntityName}
            canSave={presetStore.canApplyPresets}
            labels={presetStore.presetLabels}
            onSave={presetStore.onCreatePreset}
            renderTrigger={renderIconTrigger(
              toolLabels.save,
              <FileDown className="size-4" />,
            )}
          />
          <LayoutJsonViewDialog
            scope={jsonScope}
            data={jsonData as ComponentRowNode}
            labels={labels.layoutJsonImport}
            renderTrigger={renderIconTrigger(
              toolLabels.view,
              <FileJson className="size-4" />,
            )}
          />
          <LayoutJsonImportDialog
            scope={jsonScope}
            designSurface="recordDetail"
            definition={definition}
            defaultFieldPath="name"
            canApply={presetStore.canApplyPresets}
            labels={labels.layoutJsonImport}
            referenceData={jsonData as ComponentRowNode}
            onApply={(data) => {
              binding.setLayout(
                replaceComponentRowAt(
                  binding.layout,
                  rowRef.locator,
                  rowRef.rowId,
                  data as ComponentRowNode,
                ),
              );
            }}
            renderTrigger={renderIconTrigger(
              toolLabels.import,
              <FileUp className="size-4" />,
            )}
          />
        </div>
      </div>

      <IconButton
        type="button"
        label={toolLabels.gear}
        size="sm"
        className={cn(
          "transition-colors duration-150",
          menuOpen && "bg-muted/60",
        )}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <Settings className="size-4" />
      </IconButton>
    </div>
  );
}
