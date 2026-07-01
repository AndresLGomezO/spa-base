import { useCallback, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Workflow } from "lucide-react";
import { IconButton, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import type { DataHooksCatalogEnvelope } from "@repo/hooks/browser";

import { isApiClientError, putDataHooksCatalog } from "../../lib/api-client";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DataHookJsonToolbar } from "./DataHookJsonToolbar";
import { DataHookMetadataModal } from "./DataHookMetadataModal";
import { useDataHooks } from "./data-hooks-context";
import { dataHooksCatalogJsonLabels } from "./json/data-hook-definition-json-labels";
import { DataHooksCatalogJsonImportDialog } from "./json/DataHooksCatalogJsonImportDialog";
import { DataHooksCatalogJsonViewDialog } from "./json/DataHooksCatalogJsonViewDialog";

export function DataHookListTreePanel() {
  const { t } = useTranslation("common");
  const {
    editor,
    canUpdate,
    canCreate,
    canDelete,
    requestMetadataEdit,
    requestDelete,
  } = useDataHooks();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const catalogLabels = useMemo(() => dataHooksCatalogJsonLabels(t), [t]);
  const canReplaceCatalog = canCreate && canUpdate && canDelete;

  const handleCatalogImport = useCallback(
    async (catalog: DataHooksCatalogEnvelope) => {
      try {
        await putDataHooksCatalog(catalog, { entity: editor.entityName });
        toast.success(catalogLabels.importSuccess);
        await editor.reloadDefinitions();
      } catch (importError) {
        toast.error(
          isApiClientError(importError)
            ? importError.message
            : catalogLabels.importFailed,
        );
      }
    },
    [catalogLabels.importFailed, catalogLabels.importSuccess, editor],
  );

  const catalogActions = (
    <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
      <DataHooksCatalogJsonViewDialog
        items={editor.definitions}
        labels={catalogLabels}
      />
      <DataHooksCatalogJsonImportDialog
        existingItems={editor.definitions}
        canApply={canReplaceCatalog}
        labels={catalogLabels}
        onApply={(catalog) => void handleCatalogImport(catalog)}
      />
    </div>
  );

  const scopeSection = (
    <div className="space-y-2">
      <DataHookJsonToolbar />
      {catalogActions}
    </div>
  );

  const addRow = (
    <button
      type="button"
      className="hover:bg-muted/50 flex w-full min-w-max items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">{t("dataHooks.list.add")}</Text>
    </button>
  );

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("dataHooks.list.title")}
        expandLabel={t("dataHooks.list.expandPanel")}
        collapseLabel={t("dataHooks.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        scopeSection={scopeSection}
      >
        <div className="flex w-full min-w-max flex-col gap-1 py-1">
          {addRow}
          {editor.definitions.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {t("dataHooks.list.empty")}
            </Text>
          ) : (
            editor.definitions.map((definition) => {
              const isSelected = editor.selectedId === definition.id;
              return (
                <div
                  key={definition.id}
                  role="treeitem"
                  data-tree-node-id={`data-hook-${definition.id}`}
                  className={`group/node flex w-full min-w-max items-center gap-1 rounded-md py-1 pr-1 transition-all duration-150 ${
                    isSelected
                      ? "bg-primary/10 ring-primary ring-2 ring-inset"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => editor.setSelectedId(definition.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                    <Workflow
                      aria-hidden
                      className={`size-4 shrink-0 ${
                        definition.enabled
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    />
                    <div className="min-w-0">
                      <Text className="truncate text-sm font-medium">
                        {definition.name}
                      </Text>
                      <Text className="text-muted-foreground truncate text-xs">
                        {t(`dataHooks.phase.${definition.phase}`)}{" "}
                        {t(
                          `dataHooks.operation.${definition.trigger.operation}`,
                        )}
                      </Text>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("dataHooks.list.edit")}
                      disabled={!canUpdate}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestMetadataEdit(definition.id);
                      }}
                    >
                      <Pencil aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("dataHooks.list.delete")}
                      disabled={!canDelete}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestDelete(definition.id);
                      }}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </IconButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ItemListDesignerTreePanelShell>

      <DataHookMetadataModal
        mode="create"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
