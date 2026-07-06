import { useCallback, useMemo, useRef, useState } from "react";
import { FunctionSquare, Pencil, Plus, Trash2 } from "lucide-react";
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
import type { FormulaDefinitionsCatalogEnvelope } from "@repo/formula-definitions/browser";

import {
  isApiClientError,
  replaceFormulaDefinitionsCatalog,
} from "../../lib/api-client";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { FormulaListBadge } from "./components/FormulaListBadge";
import { FormulaStatusSummary } from "./components/FormulaStatusSummary";
import { useFormulas } from "./formulas-context";
import {
  FORMULA_LIST_ROW_HOVER_CLASS,
  FORMULA_LIST_ROW_SELECTED_CLASS,
  FORMULA_SOURCE_FILTERS,
  FORMULA_STATUS_FILTERS,
  type FormulaListSort,
  type FormulaSourceFilter,
  type FormulaStatusFilter,
} from "./formula-list-styles";
import { FormulaMetadataModal } from "./FormulaMetadataModal";
import { formulaDefinitionsCatalogJsonLabels } from "./json/formula-definition-json-labels";
import { useJsonActionTriggerLabels } from "../../components/json/json-action-trigger-labels";
import { FormulaDefinitionsCatalogJsonImportDialog } from "./json/FormulaDefinitionsCatalogJsonImportDialog";
import { FormulaDefinitionsCatalogJsonViewDialog } from "./json/FormulaDefinitionsCatalogJsonViewDialog";
import { useFormulasListQuery } from "./use-formulas-list-query";

export function FormulaListTreePanel() {
  const { t } = useTranslation("common");
  const {
    editor,
    canCreate,
    canUpdate,
    canDelete,
    requestMetadataEdit,
    requestDelete,
  } = useFormulas();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    query,
    listDefinitions,
    filteredDefinitions,
    sourceCounts,
    statusCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleSource,
    toggleStatus,
    clearFilters,
  } = useFormulasListQuery(editor.definitions);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const catalogLabels = useMemo(
    () => formulaDefinitionsCatalogJsonLabels(t),
    [t],
  );
  const triggerLabels = useJsonActionTriggerLabels();
  const canReplaceCatalog = canCreate && canUpdate;

  const displayBadges = useMemo(
    () =>
      activeFilterBadges.map((badge) => {
        if (badge.id === "search") {
          return badge;
        }
        if (badge.id === "sort") {
          const sortLabel =
            query.sort === "nameDesc"
              ? t("formulas.list.sortNameDesc")
              : query.sort === "source"
                ? t("formulas.list.sortSource")
                : query.sort === "updatedDesc"
                  ? t("formulas.list.sortUpdatedDesc")
                  : t("formulas.list.sortNameAsc");
          return {
            ...badge,
            label: sortLabel,
          };
        }
        if (badge.id.startsWith("source:")) {
          const source = badge.id.slice(
            "source:".length,
          ) as FormulaSourceFilter;
          return {
            ...badge,
            label:
              source === "platform"
                ? t("formulas.list.sourcePlatform")
                : t("formulas.list.sourceTenant"),
          };
        }
        if (badge.id.startsWith("status:")) {
          const status = badge.id.slice(
            "status:".length,
          ) as FormulaStatusFilter;
          return {
            ...badge,
            label:
              status === "enabled"
                ? t("formulas.list.statusEnabled")
                : t("formulas.list.statusDisabled"),
          };
        }
        return badge;
      }),
    [activeFilterBadges, query.sort, t],
  );

  const handleCatalogImport = useCallback(
    async (catalog: FormulaDefinitionsCatalogEnvelope) => {
      try {
        await replaceFormulaDefinitionsCatalog(catalog);
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

  const headerJsonActions = (
    <>
      <FormulaDefinitionsCatalogJsonViewDialog
        items={editor.definitions}
        labels={catalogLabels}
        triggerLabels={triggerLabels}
      />
      {canReplaceCatalog ? (
        <FormulaDefinitionsCatalogJsonImportDialog
          existingItems={editor.definitions}
          canApply={canReplaceCatalog}
          labels={catalogLabels}
          triggerLabels={triggerLabels}
          onApply={(catalog) => void handleCatalogImport(catalog)}
        />
      ) : null}
    </>
  );

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("formulas.list.filterBySource")}
        </Text>
        <div className="flex flex-col gap-2">
          {FORMULA_SOURCE_FILTERS.map((source) => (
            <Checkbox
              key={source}
              id={`formula-source-${source}`}
              checked={query.sources.includes(source)}
              onChange={() => toggleSource(source)}
              label={
                <span className="inline-flex items-center gap-2">
                  <FormulaListBadge
                    kind="source"
                    value={source}
                    size="compact"
                  />
                </span>
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("formulas.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {FORMULA_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`formula-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="inline-flex items-center gap-2">
                  <FormulaListBadge
                    kind="status"
                    value={status}
                    size="compact"
                  />
                </span>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );

  const addRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        FORMULA_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">{t("formulas.list.add")}</Text>
    </button>
  );

  const emptyMessage =
    editor.definitions.length === 0
      ? t("formulas.list.emptySource")
      : t("formulas.list.emptyFiltered");

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("formulas.list.title")}
        expandLabel={t("formulas.list.expandPanel")}
        collapseLabel={t("formulas.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        headerActions={headerJsonActions}
        jsonTriggerLabels={triggerLabels}
        scopeSection={
          <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
            <div className="w-full py-0.5">
              <SearchField
                value={query.search}
                onChange={setSearch}
                placeholder={t("formulas.list.searchPlaceholder")}
                ariaLabel={t("formulas.list.searchPlaceholder")}
                clearAriaLabel={t("formulas.list.searchClear")}
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
                    triggerLabel={t("formulas.list.filter")}
                    clearAllLabel={t("formulas.list.clearFilters")}
                    removeAriaLabel={(label) =>
                      t("formulas.list.removeBadge", { label })
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
                            {t("formulas.list.sort")}
                          </span>
                          <Select
                            selectSize="sm"
                            className="w-auto min-w-[9rem]"
                            value={query.sort}
                            onChange={(event) =>
                              setSort(event.target.value as FormulaListSort)
                            }
                            aria-label={t("formulas.list.sort")}
                          >
                            <option value="nameAsc">
                              {t("formulas.list.sortNameAsc")}
                            </option>
                            <option value="nameDesc">
                              {t("formulas.list.sortNameDesc")}
                            </option>
                            <option value="source">
                              {t("formulas.list.sortSource")}
                            </option>
                            <option value="updatedDesc">
                              {t("formulas.list.sortUpdatedDesc")}
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
                clearAllLabel={t("formulas.list.clearFilters")}
                disabled={!hasActiveFilters}
              >
                {filterBody}
              </FilterPanelBody>
            </div>

            <FormulaStatusSummary
              sourceCounts={sourceCounts}
              statusCounts={statusCounts}
              total={filteredDefinitions.length}
            />
          </div>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-1 py-1">
          {addRow}
          {listDefinitions.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {emptyMessage}
            </Text>
          ) : (
            listDefinitions.map((definition) => {
              const isSelected = editor.selectedId === definition.id;
              const status: FormulaStatusFilter = definition.enabled
                ? "enabled"
                : "disabled";

              return (
                <div
                  key={definition.id}
                  role="treeitem"
                  className={cn(
                    "group/node flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-150",
                    isSelected
                      ? FORMULA_LIST_ROW_SELECTED_CLASS
                      : FORMULA_LIST_ROW_HOVER_CLASS,
                  )}
                  onClick={() => editor.setSelectedId(definition.id)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2 px-2">
                    <FunctionSquare
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        definition.enabled
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                      )}
                    />
                    <div className="min-w-0 space-y-1">
                      <Text className="break-words text-sm font-medium">
                        {definition.name}
                      </Text>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <FormulaListBadge
                          kind="source"
                          value={definition.source}
                          size="compact"
                        />
                        <FormulaListBadge
                          kind="status"
                          value={status}
                          size="compact"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("formulas.list.edit")}
                      disabled={!canUpdate || definition.source === "platform"}
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
                      label={t("formulas.list.delete")}
                      disabled={!canDelete || definition.source === "platform"}
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

      <FormulaMetadataModal
        mode="create"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
