import { useCallback, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { IconButton, Text, toast } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import type { DataHooksCatalogEnvelope } from "@repo/hooks/browser";
import { isScheduleTrigger } from "@repo/hooks";

import { isApiClientError, putDataHooksCatalog } from "../../lib/api-client";
import {
  DEBUGGER_LIST_ROW_HOVER_CLASS,
  DEBUGGER_LIST_ROW_SELECTED_CLASS,
} from "../debugger/debugger-status-styles";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DataHookMetadataModal } from "./DataHookMetadataModal";
import { useDataHooks } from "./data-hooks-context";
import { dataHooksCatalogJsonLabels } from "./json/data-hook-definition-json-labels";
import { DataHooksCatalogJsonImportDialog } from "./json/DataHooksCatalogJsonImportDialog";
import { DataHooksCatalogJsonViewDialog } from "./json/DataHooksCatalogJsonViewDialog";
import { IndexEnvironmentBlockedNotice } from "../../components/index-provisioning/IndexEnvironmentBlockedNotice";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";

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
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();

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
    <div className="flex w-full min-w-0 flex-col gap-2 px-2 pb-2">
      {!isEnvironmentReady ? (
        <IndexEnvironmentBlockedNotice
          feature="import"
          buildingCollections={buildingCollections}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <DataHooksCatalogJsonViewDialog
          items={editor.definitions}
          labels={catalogLabels}
        />
        <DataHooksCatalogJsonImportDialog
          existingItems={editor.definitions}
          canApply={canReplaceCatalog}
          importDisabled={!isEnvironmentReady}
          labels={catalogLabels}
          onApply={(catalog) => void handleCatalogImport(catalog)}
        />
      </div>
    </div>
  );

  const scopeSection = catalogActions;

  const addRow = (
    <button
      type="button"
      className="hover:bg-muted/50 flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="min-w-0 break-words text-sm font-medium">
        {t("dataHooks.list.add")}
      </Text>
    </button>
  );

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("dataHooks.list.title")}
        expandLabel={t("dataHooks.list.expandPanel")}
        collapseLabel={t("dataHooks.list.collapsePanel")}
        expandedClassName={cn(
          designerTreePanelShellClassName,
          "w-80 shrink-0 min-w-0",
        )}
        collapsedClassName={designerTreePanelShellClassName}
        expandedBodyClassName="w-full min-w-0 overflow-x-hidden"
        collapsedContent={addRow}
        scopeSection={scopeSection}
      >
        <div className="flex w-full min-w-0 flex-col gap-2 py-1">
          {addRow}
          {editor.definitions.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {t("dataHooks.list.empty")}
            </Text>
          ) : (
            <ul className="space-y-2.5 px-1">
              {editor.definitions.map((definition) => {
                const isSelected = editor.selectedId === definition.id;
                const subtitle = `${t(`dataHooks.phase.${definition.phase}`)} ${
                  isScheduleTrigger(definition.trigger)
                    ? t("dataHooks.triggerKind.schedule")
                    : t(`dataHooks.operation.${definition.trigger.operation}`)
                }`;

                return (
                  <li key={definition.id}>
                    <div
                      role="treeitem"
                      data-tree-node-id={`data-hook-${definition.id}`}
                      className={cn(
                        "group/node flex w-full min-w-0 cursor-pointer items-start gap-1 rounded-md border-l-2 py-2 pr-1 transition-colors duration-150",
                        definition.enabled
                          ? "border-l-transparent"
                          : "border-l-muted-foreground/40",
                        isSelected
                          ? DEBUGGER_LIST_ROW_SELECTED_CLASS
                          : DEBUGGER_LIST_ROW_HOVER_CLASS,
                      )}
                      onClick={() => editor.setSelectedId(definition.id)}
                    >
                      <div className="min-w-0 flex-1 px-2">
                        <Text
                          className={cn(
                            "min-w-0 break-words text-sm font-medium",
                            !definition.enabled && "text-muted-foreground",
                          )}
                        >
                          {definition.name}
                        </Text>
                        <Text className="text-muted-foreground mt-0.5 break-words text-xs">
                          {subtitle}
                        </Text>
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
                  </li>
                );
              })}
            </ul>
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
