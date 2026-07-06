import { useCallback, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  IconButton,
  SearchField,
  Select,
  Text,
  toast,
  useFilterPanelDismiss,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import type { DataHooksCatalogEnvelope } from "@repo/hooks/browser";
import { isScheduleTrigger } from "@repo/hooks";

import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { isApiClientError, putDataHooksCatalog } from "../../lib/api-client";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { DataHookMetadataModal } from "./DataHookMetadataModal";
import { useDataHooks } from "./data-hooks-context";
import {
  DATA_HOOK_LIST_ROW_HOVER_CLASS,
  DATA_HOOK_LIST_ROW_SELECTED_CLASS,
  DATA_HOOK_PHASE_FILTERS,
  DATA_HOOK_STATUS_FILTERS,
  DATA_HOOK_TRIGGER_KIND_FILTERS,
  type DataHookListSort,
  type DataHookPhaseFilter,
  type DataHookStatusFilter,
  type DataHookTriggerKindFilter,
} from "./data-hook-list-styles";
import { dataHooksCatalogJsonLabels } from "./json/data-hook-definition-json-labels";
import { DataHooksCatalogJsonImportDialog } from "./json/DataHooksCatalogJsonImportDialog";
import { DataHooksCatalogJsonViewDialog } from "./json/DataHooksCatalogJsonViewDialog";
import { IndexEnvironmentBlockedNotice } from "../../components/index-provisioning/IndexEnvironmentBlockedNotice";
import { useJsonActionTriggerLabels } from "../../components/json/json-action-trigger-labels";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";
import { useDataHooksListQuery } from "./use-data-hooks-list-query";

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
  const { items: entities } = useEntityCatalog();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const catalogLabels = dataHooksCatalogJsonLabels(t);
  const triggerLabels = useJsonActionTriggerLabels();
  const canReplaceCatalog = canCreate && canUpdate && canDelete;
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();

  const {
    query,
    listDefinitions,
    filteredDefinitions,
    entityOptions,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleEntity,
    togglePhase,
    toggleTriggerKind,
    toggleStatus,
    clearFilters,
  } = useDataHooksListQuery(editor.definitions);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const entityLabelByName = useMemo(() => {
    const labels = new Map<string, string>();
    for (const entity of entities) {
      labels.set(entity.name, getEntityLabel(entity));
    }
    return labels;
  }, [entities]);

  const displayBadges = useMemo(
    () =>
      activeFilterBadges.map((badge) => {
        if (badge.id === "search") {
          return badge;
        }
        if (badge.id === "sort") {
          const sortLabel =
            query.sort === "nameDesc"
              ? t("dataHooks.list.sortNameDesc")
              : query.sort === "entity"
                ? t("dataHooks.list.sortEntity")
                : query.sort === "updatedDesc"
                  ? t("dataHooks.list.sortUpdatedDesc")
                  : query.sort === "order"
                    ? t("dataHooks.list.sortOrder")
                    : t("dataHooks.list.sortNameAsc");
          return {
            ...badge,
            label: sortLabel,
          };
        }
        if (badge.id.startsWith("entity:")) {
          const entity = badge.id.slice("entity:".length);
          return {
            ...badge,
            label: entityLabelByName.get(entity) ?? entity,
          };
        }
        if (badge.id.startsWith("phase:")) {
          const phase = badge.id.slice("phase:".length) as DataHookPhaseFilter;
          return {
            ...badge,
            label:
              phase === "before"
                ? t("dataHooks.phase.before")
                : t("dataHooks.phase.after"),
          };
        }
        if (badge.id.startsWith("triggerKind:")) {
          const triggerKind = badge.id.slice(
            "triggerKind:".length,
          ) as DataHookTriggerKindFilter;
          return {
            ...badge,
            label:
              triggerKind === "crud"
                ? t("dataHooks.list.triggerKindCrud")
                : t("dataHooks.list.triggerKindSchedule"),
          };
        }
        if (badge.id.startsWith("status:")) {
          const status = badge.id.slice(
            "status:".length,
          ) as DataHookStatusFilter;
          return {
            ...badge,
            label:
              status === "enabled"
                ? t("dataHooks.list.statusEnabled")
                : t("dataHooks.list.statusDisabled"),
          };
        }
        return badge;
      }),
    [activeFilterBadges, entityLabelByName, query.sort, t],
  );

  const handleCatalogImport = useCallback(
    async (catalog: DataHooksCatalogEnvelope) => {
      try {
        await putDataHooksCatalog(catalog);
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

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      {entityOptions.length > 0 ? (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("dataHooks.list.filters.entity")}
          </Text>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {entityOptions.map((entity) => (
              <Checkbox
                key={entity}
                id={`data-hook-entity-${entity}`}
                checked={query.entities.includes(entity)}
                onChange={() => toggleEntity(entity)}
                label={entityLabelByName.get(entity) ?? entity}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("dataHooks.list.filters.phase")}
        </Text>
        <div className="flex flex-col gap-2">
          {DATA_HOOK_PHASE_FILTERS.map((phase) => (
            <Checkbox
              key={phase}
              id={`data-hook-phase-${phase}`}
              checked={query.phases.includes(phase)}
              onChange={() => togglePhase(phase)}
              label={
                phase === "before"
                  ? t("dataHooks.phase.before")
                  : t("dataHooks.phase.after")
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("dataHooks.list.filters.triggerKind")}
        </Text>
        <div className="flex flex-col gap-2">
          {DATA_HOOK_TRIGGER_KIND_FILTERS.map((triggerKind) => (
            <Checkbox
              key={triggerKind}
              id={`data-hook-trigger-kind-${triggerKind}`}
              checked={query.triggerKinds.includes(triggerKind)}
              onChange={() => toggleTriggerKind(triggerKind)}
              label={
                triggerKind === "crud"
                  ? t("dataHooks.list.triggerKindCrud")
                  : t("dataHooks.list.triggerKindSchedule")
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("dataHooks.list.filters.status")}
        </Text>
        <div className="flex flex-col gap-2">
          {DATA_HOOK_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`data-hook-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                status === "enabled"
                  ? t("dataHooks.list.statusEnabled")
                  : t("dataHooks.list.statusDisabled")
              }
            />
          ))}
        </div>
      </div>
    </div>
  );

  const headerJsonActions = (
    <>
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
    </>
  );

  const indexNoticeSection = !isEnvironmentReady ? (
    <IndexEnvironmentBlockedNotice
      feature="import"
      buildingCollections={buildingCollections}
    />
  ) : null;

  const scopeSection = (
    <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
      <div className="w-full py-0.5">
        <SearchField
          value={query.search}
          onChange={setSearch}
          placeholder={t("dataHooks.list.searchPlaceholder")}
          ariaLabel={t("dataHooks.list.searchPlaceholder")}
          clearAriaLabel={t("dataHooks.list.searchClear")}
          className="max-w-none min-w-0 w-full"
        />
      </div>

      <div
        ref={toolbarRef}
        className={`w-full min-w-0 ${filtersOpen ? "relative isolate z-30" : ""}`}
      >
        <div className="flex w-full min-w-0 flex-nowrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <FilterPanel
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeBadges={displayBadges}
              triggerLabel={t("dataHooks.list.filter")}
              clearAllLabel={t("dataHooks.list.clearFilters")}
              removeAriaLabel={(label) =>
                t("dataHooks.list.removeBadge", { label })
              }
              onClearAll={clearFilters}
              badgesBelowToolbar
              renderBody={false}
              compact
              toolbarFillWidth
              manageDismiss={false}
              sibling={
                <div className="w-auto shrink-0 py-0.5">
                  <label className="inline-flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t("dataHooks.list.sort")}
                    </span>
                    <Select
                      selectSize="sm"
                      className="w-auto min-w-[9rem]"
                      value={query.sort}
                      onChange={(event) =>
                        setSort(event.target.value as DataHookListSort)
                      }
                      aria-label={t("dataHooks.list.sort")}
                    >
                      <option value="order">
                        {t("dataHooks.list.sortOrder")}
                      </option>
                      <option value="nameAsc">
                        {t("dataHooks.list.sortNameAsc")}
                      </option>
                      <option value="nameDesc">
                        {t("dataHooks.list.sortNameDesc")}
                      </option>
                      <option value="entity">
                        {t("dataHooks.list.sortEntity")}
                      </option>
                      <option value="updatedDesc">
                        {t("dataHooks.list.sortUpdatedDesc")}
                      </option>
                    </Select>
                  </label>
                </div>
              }
            >
              {filterBody}
            </FilterPanel>
          </div>
        </div>
        <FilterPanelBody
          open={filtersOpen}
          onClearAll={clearFilters}
          clearAllLabel={t("dataHooks.list.clearFilters")}
          disabled={!hasActiveFilters}
        >
          {filterBody}
        </FilterPanelBody>
      </div>

      <Text className="text-muted-foreground px-0 text-xs">
        {t("dataHooks.list.summary", { count: filteredDefinitions.length })}
      </Text>

      {indexNoticeSection}
    </div>
  );

  const addRow = (
    <button
      type="button"
      className={cn(
        "hover:bg-muted/50 flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        DATA_HOOK_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="min-w-0 break-words text-sm font-medium">
        {t("dataHooks.list.add")}
      </Text>
    </button>
  );

  const emptyMessage =
    editor.definitions.length === 0
      ? t("dataHooks.list.emptyGlobal")
      : t("dataHooks.list.emptyFiltered");

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
        headerActions={headerJsonActions}
        jsonTriggerLabels={triggerLabels}
        scopeSection={scopeSection}
      >
        <div className="flex w-full min-w-0 flex-col gap-2 py-1">
          {addRow}
          {listDefinitions.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {emptyMessage}
            </Text>
          ) : (
            <ul className="space-y-2.5 px-1">
              {listDefinitions.map((definition) => {
                const isSelected = editor.selectedId === definition.id;
                const entityLabel =
                  entityLabelByName.get(definition.entity) ?? definition.entity;
                const operationLabel = isScheduleTrigger(definition.trigger)
                  ? t("dataHooks.triggerKind.schedule")
                  : definition.trigger.operation === "update"
                    ? t("dataHooks.operation.update")
                    : definition.trigger.operation === "delete"
                      ? t("dataHooks.operation.delete")
                      : t("dataHooks.operation.create");
                const subtitle = `${entityLabel} · ${
                  definition.phase === "before"
                    ? t("dataHooks.phase.before")
                    : t("dataHooks.phase.after")
                } ${operationLabel}`;

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
                          ? DATA_HOOK_LIST_ROW_SELECTED_CLASS
                          : DATA_HOOK_LIST_ROW_HOVER_CLASS,
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
