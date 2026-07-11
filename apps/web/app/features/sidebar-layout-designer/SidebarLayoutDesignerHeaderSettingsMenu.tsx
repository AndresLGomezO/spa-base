import { useMemo, useState, type ReactNode } from "react";
import { FileJson, FileUp, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { putTenantSidebarLayoutInputSchema } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { Button, IconButton, Modal, Popover, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";

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

export function SidebarLayoutDesignerHeaderSettingsMenu() {
  const { t } = useTranslation("common");
  const { editor, canSave } = useSidebarLayoutDesigner();
  const exportData = useMemo(
    () => ({
      sidebarLayout: editor.sidebarLayout,
      settings: editor.settings,
    }),
    [editor.settings, editor.sidebarLayout],
  );
  const exportJson = useMemo(
    () => JSON.stringify(exportData, null, 2),
    [exportData],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const importValidation = useMemo(() => {
    if (importJson.trim().length === 0) {
      return { ok: false as const, errors: [] as string[] };
    }

    try {
      const parsed = JSON.parse(importJson) as unknown;
      const result = putTenantSidebarLayoutInputSchema.safeParse(parsed);
      if (!result.success) {
        return {
          ok: false as const,
          errors: result.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          ),
        };
      }

      return { ok: true as const, data: result.data };
    } catch {
      return { ok: false as const, errors: ["Invalid JSON"] };
    }
  }, [importJson]);

  const toolLabels = {
    view: t("formDesigner.headerTools.view"),
    import: t("formDesigner.headerTools.import"),
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleApplyImport = () => {
    if (!importValidation.ok || !canSave) {
      return;
    }

    editor.setSidebarLayout(
      importValidation.data.sidebarLayout as UiLayoutDocument,
    );
    editor.setSettings(importValidation.data.settings);
    setImportDialogOpen(false);
    setImportJson("");
    setImportError(null);
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
            label={t("sidebarLayoutDesigner.settings")}
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
              setImportJson("");
              setImportError(null);
            }}
          />
        </div>
      </Popover>

      <Modal
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        title={t("sidebarLayoutDesigner.settings")}
      >
        <div className="flex flex-col gap-3">
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.sliceJson.viewDescription")}
          </Text>
          <textarea
            readOnly
            value={exportJson}
            className="border-input bg-background min-h-80 w-full rounded-md border p-3 font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopy()}
            >
              {copied
                ? t("designLayout.sliceJson.viewCopied")
                : t("designLayout.sliceJson.viewCopy")}
            </Button>
            <Button type="button" onClick={() => setViewDialogOpen(false)}>
              {t("designLayout.sliceJson.cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title={t("sidebarLayoutDesigner.settings")}
      >
        <div className="flex flex-col gap-3">
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.sliceJson.importDescription")}
          </Text>
          <textarea
            value={importJson}
            onChange={(event) => {
              setImportJson(event.target.value);
              setImportError(null);
            }}
            className="border-input bg-background min-h-80 w-full rounded-md border p-3 font-mono text-xs"
          />
          {!importValidation.ok && importValidation.errors.length > 0 ? (
            <Text className="text-destructive text-sm">
              {importValidation.errors.join("\n")}
            </Text>
          ) : importValidation.ok ? (
            <Text className="text-sm text-green-600">
              {t("designLayout.sliceJson.valid")}
            </Text>
          ) : null}
          {importError ? (
            <Text className="text-destructive text-sm">{importError}</Text>
          ) : null}
          {!canSave ? (
            <Text className="text-muted-foreground text-sm">
              {t("designLayout.sliceJson.readOnlyHint")}
            </Text>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
            >
              {t("designLayout.sliceJson.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!canSave || !importValidation.ok}
              onClick={handleApplyImport}
            >
              {t("designLayout.sliceJson.apply")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
