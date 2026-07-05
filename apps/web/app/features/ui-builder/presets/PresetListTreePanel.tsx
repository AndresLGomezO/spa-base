import { useCallback, useMemo, useRef, useState } from "react";
import { LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  IconButton,
  SearchField,
  Select,
  Text,
  useFilterPanelDismiss,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

import { ItemListDesignerTreePanelShell } from "../../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../designer-tree-workbench-classes";
import { PresetListBadge } from "./PresetListBadge";
import type { PresetCatalogEntryId } from "./preset-catalog-entry";
import {
  PRESET_LIST_ROW_HOVER_CLASS,
  PRESET_LIST_ROW_SELECTED_CLASS,
  PRESET_SOURCE_FILTERS,
  type PresetListSort,
} from "./preset-list-styles";
import type { PresetSourceFilter } from "./preset-catalog-entry";
import { usePresets } from "./presets-context";
import { usePresetsListQuery } from "./use-presets-list-query";

export function PresetListTreePanel() {
  const { t } = useTranslation("common");
  const {
    editor,
    canCreate,
    canUpdate,
    canDelete,
    openCreateModal,
    requestDelete,
  } = usePresets();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    query,
    listEntries,
    filteredEntries,
    sourceCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleSource,
    clearFilters,
    presetSourceLabelKey: sourceLabelKey,
    presetSortLabelKey: sortLabelKey,
  } = usePresetsListQuery(editor.entries);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const displayBadges = useMemo(
    () =>
      activeFilterBadges.map((badge) => {
        if (badge.id === "search") {
          return badge;
        }
        if (badge.id === "sort") {
          return {
            ...badge,
            label: t(sortLabelKey(query.sort)),
          };
        }
        if (badge.id.startsWith("source:")) {
          const source = badge.id.slice("source:".length) as PresetSourceFilter;
          return {
            ...badge,
            label: t(sourceLabelKey(source)),
          };
        }
        return badge;
      }),
    [activeFilterBadges, query.sort, sortLabelKey, sourceLabelKey, t],
  );

  const filterBody = (
    <div className="space-y-3">
      <Text className="text-muted-foreground text-xs font-medium">
        {t("designLayout.presets.list.filterBySource")}
      </Text>
      <div className="flex flex-col gap-2">
        {PRESET_SOURCE_FILTERS.map((source) => (
          <Checkbox
            key={source}
            id={`preset-source-${source}`}
            checked={query.sources.includes(source)}
            onChange={() => toggleSource(source)}
            label={
              <span className="inline-flex items-center gap-2">
                <PresetListBadge source={source} size="compact" />
              </span>
            }
          />
        ))}
      </div>
    </div>
  );

  const addRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        PRESET_LIST_ROW_HOVER_CLASS,
      )}
      onClick={openCreateModal}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">
        {t("designLayout.presets.list.add")}
      </Text>
    </button>
  );

  const emptyMessage =
    editor.entries.length === 0
      ? t("designLayout.presets.list.emptySource")
      : t("designLayout.presets.list.emptyFiltered");

  const handleSelect = useCallback(
    (id: PresetCatalogEntryId) => {
      editor.setSelectedId(id);
    },
    [editor],
  );

  return (
    <ItemListDesignerTreePanelShell
      title={t("designLayout.presets.list.title")}
      expandLabel={t("designLayout.presets.list.expandPanel")}
      collapseLabel={t("designLayout.presets.list.collapsePanel")}
      expandedClassName={designerTreePanelShellClassName}
      collapsedClassName={designerTreePanelShellClassName}
      collapsedContent={addRow}
      scopeSection={
        <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
          <div className="w-full py-0.5">
            <SearchField
              value={query.search}
              onChange={setSearch}
              placeholder={t("designLayout.presets.list.searchPlaceholder")}
              ariaLabel={t("designLayout.presets.list.searchPlaceholder")}
              clearAriaLabel={t("designLayout.presets.list.searchClear")}
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
                  triggerLabel={t("designLayout.presets.list.filter")}
                  clearAllLabel={t("designLayout.presets.list.clearFilters")}
                  removeAriaLabel={(label) =>
                    t("designLayout.presets.list.removeBadge", { label })
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
                          {t("designLayout.presets.list.sort")}
                        </span>
                        <Select
                          selectSize="sm"
                          className="w-auto min-w-[9rem]"
                          value={query.sort}
                          onChange={(event) =>
                            setSort(event.target.value as PresetListSort)
                          }
                          aria-label={t("designLayout.presets.list.sort")}
                        >
                          <option value="nameAsc">
                            {t("designLayout.presets.list.sortNameAsc")}
                          </option>
                          <option value="nameDesc">
                            {t("designLayout.presets.list.sortNameDesc")}
                          </option>
                          <option value="source">
                            {t("designLayout.presets.list.sortSource")}
                          </option>
                          <option value="updatedDesc">
                            {t("designLayout.presets.list.sortUpdatedDesc")}
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
              clearAllLabel={t("designLayout.presets.list.clearFilters")}
              disabled={!hasActiveFilters}
            >
              {filterBody}
            </FilterPanelBody>
          </div>

          <Text className="text-muted-foreground px-1 text-xs">
            {t("designLayout.presets.list.summary", {
              count: filteredEntries.length,
              platform: sourceCounts.platform ?? 0,
              tenant: sourceCounts.tenant ?? 0,
            })}
          </Text>
        </div>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-1 py-1">
        {addRow}
        {listEntries.length === 0 ? (
          <Text className="text-muted-foreground px-2 py-3 text-sm">
            {emptyMessage}
          </Text>
        ) : (
          listEntries.map((entry) => {
            const isSelected = editor.selectedId === entry.id;
            const isPlatform = entry.source === "platform";

            return (
              <div
                key={entry.id}
                role="treeitem"
                className={cn(
                  "group/node flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-150",
                  isSelected
                    ? PRESET_LIST_ROW_SELECTED_CLASS
                    : PRESET_LIST_ROW_HOVER_CLASS,
                )}
                onClick={() => handleSelect(entry.id)}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2 px-2">
                  <LayoutTemplate
                    aria-hidden
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  />
                  <div className="min-w-0 space-y-1">
                    <Text className="break-words text-sm font-medium">
                      {entry.name}
                    </Text>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PresetListBadge source={entry.source} size="compact" />
                      {entry.isDefault ? (
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                          {t("designLayout.systemPresets.default")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
                  <IconButton
                    type="button"
                    size="sm"
                    label={t("designLayout.presets.list.edit")}
                    disabled={isPlatform || !canUpdate}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelect(entry.id);
                    }}
                  >
                    <Pencil aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    type="button"
                    size="sm"
                    label={t("designLayout.presets.list.delete")}
                    disabled={isPlatform || !canDelete}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestDelete(entry.id);
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
  );
}
