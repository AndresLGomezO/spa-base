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
  entityCardViewAdapter,
} from "@repo/ui-builder-react";
import { type ColumnNode } from "@repo/ui-builder-core";
import { IconButton, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useUiBuilderPresetStore } from "../ui-builder/use-ui-builder-preset-store";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import {
  findColumnByRef,
  replaceColumnAtRef,
} from "../form-designer/form-designer-components-layout";
import { resolveScopeLayoutBinding } from "./item-list-designer-layout-binding";
import { resolveDesignSurfaceForScope } from "./item-list-designer-structure-scope";
import { useItemListDesigner } from "./item-list-designer-context";

function defaultFieldPath(
  definition: ReturnType<typeof useEntityDefinition>,
): string {
  const fieldPaths = Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
  return fieldPaths[0] ?? "name";
}

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

interface ItemListDesignerComponentColumnPanelHeaderMenuProps {
  readonly columnRef: ComponentColumnRef;
}

export function ItemListDesignerComponentColumnPanelHeaderMenu({
  columnRef,
}: ItemListDesignerComponentColumnPanelHeaderMenuProps) {
  const { t } = useTranslation("common");
  const { editor, structureScope } = useItemListDesigner();
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useFormDesignerLayoutEditorLabels();
  const presetStore = useUiBuilderPresetStore(definition.name);
  const fieldPath = defaultFieldPath(definition);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const binding = useMemo(
    () => resolveScopeLayoutBinding(editor, structureScope),
    [editor, structureScope],
  );

  const resolved = findColumnByRef(binding.layout, columnRef);
  const column = resolved?.column;
  const designSurface = resolveDesignSurfaceForScope(structureScope);

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

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

  if (!column) {
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

  const applyColumn = (data: ColumnNode) => {
    binding.setLayout(replaceColumnAtRef(binding.layout, columnRef, data));
  };

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
            kind="column"
            designSurface={designSurface}
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
            kind="column"
            node={column}
            designSurface={designSurface}
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
            scope={{ type: "column" }}
            data={column}
            labels={labels.layoutJsonImport}
            renderTrigger={renderIconTrigger(
              toolLabels.view,
              <FileJson className="size-4" />,
            )}
          />
          <LayoutJsonImportDialog
            scope={{ type: "column" }}
            designSurface={designSurface}
            definition={definition}
            defaultFieldPath={fieldPath}
            canApply={presetStore.canApplyPresets}
            labels={labels.layoutJsonImport}
            referenceData={column}
            onApply={(data) => applyColumn(data as ColumnNode)}
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
