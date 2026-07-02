import { useCallback, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Search } from "lucide-react";
import { IconButton, Text, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import type { EntityQueryDefinitionsCatalogEnvelope } from "@repo/entity-queries/browser";

import {
  isApiClientError,
  putEntityQueryDefinitionsCatalog,
} from "../../lib/api-client";
import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { EntityQueryMetadataModal } from "./EntityQueryMetadataModal";
import { useEntityQueryBuilder } from "./entity-query-builder-context";
import { entityQueryDefinitionsCatalogJsonLabels } from "./json/entity-query-definition-json-labels";
import { EntityQueryDefinitionsCatalogJsonImportDialog } from "./json/EntityQueryDefinitionsCatalogJsonImportDialog";
import { EntityQueryDefinitionsCatalogJsonViewDialog } from "./json/EntityQueryDefinitionsCatalogJsonViewDialog";
import { IndexEnvironmentBlockedNotice } from "../../components/index-provisioning/IndexEnvironmentBlockedNotice";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";

export function EntityQueryListTreePanel() {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const {
    editor,
    canUpdate,
    canCreate,
    canDelete,
    requestMetadataEdit,
    requestDelete,
  } = useEntityQueryBuilder();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const catalogLabels = useMemo(
    () => entityQueryDefinitionsCatalogJsonLabels(t),
    [t],
  );
  const canReplaceCatalog = canCreate && canUpdate && canDelete;
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();

  const handleCatalogImport = useCallback(
    async (catalog: EntityQueryDefinitionsCatalogEnvelope) => {
      try {
        await putEntityQueryDefinitionsCatalog(catalog);
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

  const handleOpenCreate = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const addRow = (
    <button
      type="button"
      className="hover:bg-muted/50 flex w-full min-w-max items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
      onClick={handleOpenCreate}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">{t("queryBuilder.list.add")}</Text>
    </button>
  );

  const catalogActions = (
    <div className="flex flex-col gap-2 px-2 pb-2">
      {!isEnvironmentReady ? (
        <IndexEnvironmentBlockedNotice
          feature="import"
          buildingCollections={buildingCollections}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <EntityQueryDefinitionsCatalogJsonViewDialog
          items={editor.definitions}
          labels={catalogLabels}
        />
        <EntityQueryDefinitionsCatalogJsonImportDialog
          existingItems={editor.definitions}
          canApply={canReplaceCatalog}
          importDisabled={!isEnvironmentReady}
          labels={catalogLabels}
          onApply={(catalog) => void handleCatalogImport(catalog)}
        />
      </div>
    </div>
  );

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("queryBuilder.list.title")}
        expandLabel={t("queryBuilder.list.expandPanel")}
        collapseLabel={t("queryBuilder.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        scopeSection={catalogActions}
      >
        <div className="flex w-full min-w-max flex-col gap-1 py-1">
          {addRow}
          {editor.definitions.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {t("queryBuilder.list.empty")}
            </Text>
          ) : (
            editor.definitions.map((definition) => {
              const entity = entities.find(
                (entry) => entry.name === definition.sourceEntity,
              );
              const entityLabel = entity
                ? getEntityLabel(entity)
                : definition.sourceEntity;
              const isSelected = editor.selectedId === definition.id;

              return (
                <div
                  key={definition.id}
                  role="treeitem"
                  data-tree-node-id={`query-${definition.id}`}
                  className={`group/node flex w-full min-w-max items-center gap-1 rounded-md py-1 pr-1 transition-all duration-150 ${
                    isSelected
                      ? "bg-primary/10 ring-primary ring-2 ring-inset"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => editor.setSelectedId(definition.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                    <Search
                      aria-hidden
                      className="text-muted-foreground size-4 shrink-0"
                    />
                    <div className="min-w-0">
                      <Text className="truncate text-sm font-medium">
                        {definition.name}
                      </Text>
                      <Text className="text-muted-foreground truncate text-xs">
                        {entityLabel}
                      </Text>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("queryBuilder.list.edit")}
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
                      label={t("queryBuilder.list.delete")}
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

      <EntityQueryMetadataModal
        mode="create"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
