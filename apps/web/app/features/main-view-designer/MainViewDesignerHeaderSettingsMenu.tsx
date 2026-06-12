import { useMemo, useState, type ReactNode } from "react";
import { FileJson, FileUp, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton, Popover, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { designLayoutSliceJsonLabels } from "../ui-builder/design-layout-slice-json-labels";
import { DesignLayoutSliceJsonImportDialog } from "../ui-builder/DesignLayoutSliceJsonImportDialog";
import { DesignLayoutSliceJsonViewDialog } from "../ui-builder/DesignLayoutSliceJsonViewDialog";
import { useMainViewDesigner } from "./main-view-designer-context";

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

export function MainViewDesignerHeaderSettingsMenu() {
  const { t } = useTranslation("common");
  const { editor, canSave } = useMainViewDesigner();
  const definition = useEntityDefinition(editor.entityName);
  const labels = useMemo(() => designLayoutSliceJsonLabels(t, "mainPage"), [t]);
  const exportData = editor.exportSlice();
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const toolLabels = {
    view: t("formDesigner.headerTools.view"),
    import: t("formDesigner.headerTools.import"),
  };

  return (
    <>
      <Popover
        open={menuOpen}
        onOpenChange={setMenuOpen}
        placement="bottom-end"
        title={t("formDesigner.headerTools.title")}
        panelClassName="w-auto"
        trigger={
          <IconButton
            type="button"
            label={t("mainViewDesigner.settings")}
            size="sm"
            className={cn(menuOpen && "bg-muted/60")}
          >
            <Settings className="size-4" />
          </IconButton>
        }
      >
        <div className="flex items-center gap-0.5">
          <ToolAction
            label={toolLabels.view}
            icon={<FileJson className="size-4" />}
            onClick={() => {
              setMenuOpen(false);
              setViewDialogOpen(true);
            }}
          />
          <ToolAction
            label={toolLabels.import}
            icon={<FileUp className="size-4" />}
            onClick={() => {
              setMenuOpen(false);
              setImportDialogOpen(true);
            }}
          />
        </div>
      </Popover>

      <DesignLayoutSliceJsonViewDialog
        surface="mainPage"
        data={exportData}
        labels={labels}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
      <DesignLayoutSliceJsonImportDialog
        surface="mainPage"
        definition={definition}
        canApply={canSave}
        labels={labels}
        onApply={editor.applySlice}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </>
  );
}
