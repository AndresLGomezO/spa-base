import { useRef, useState } from "react";
import { BookText, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  IconButton,
  SearchField,
  Text,
  useFilterPanelDismiss,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { useUserAiContext } from "./user-ai-context-context";
import { UserAiContextMetadataModal } from "./UserAiContextMetadataModal";
import {
  DEFAULT_USER_AI_CONTEXT_LIST_SORT,
  USER_AI_CONTEXT_BLOCK_KIND_FILTERS,
  USER_AI_CONTEXT_LIST_ROW_HOVER_CLASS,
  USER_AI_CONTEXT_LIST_ROW_SELECTED_CLASS,
  USER_AI_CONTEXT_SCOPE_FILTERS,
  USER_AI_CONTEXT_STATUS_FILTERS,
  type UserAiContextBlockKindFilter,
  type UserAiContextListSort,
} from "./user-ai-context-list-styles";
import { useUserAiContextListQuery } from "./use-user-ai-context-list-query";

function blockKindLabelKey(
  kind: UserAiContextBlockKindFilter,
):
  | "userAiContext.blocks.kinds.staticMarkdown"
  | "userAiContext.blocks.kinds.entityField"
  | "userAiContext.blocks.kinds.entityRecordsSummary"
  | "userAiContext.blocks.kinds.metricValue"
  | "userAiContext.blocks.kinds.savedQueryTop" {
  switch (kind) {
    case "staticMarkdown":
      return "userAiContext.blocks.kinds.staticMarkdown";
    case "entityField":
      return "userAiContext.blocks.kinds.entityField";
    case "entityRecordsSummary":
      return "userAiContext.blocks.kinds.entityRecordsSummary";
    case "metricValue":
      return "userAiContext.blocks.kinds.metricValue";
    case "savedQueryTop":
      return "userAiContext.blocks.kinds.savedQueryTop";
  }
}

export function UserAiContextListTreePanel() {
  const { t } = useTranslation("common");
  const {
    editor,
    canCreate,
    canUpdate,
    canDelete,
    requestMetadataEdit,
    requestDelete,
  } = useUserAiContext();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    query,
    listDefinitions,
    availableEntities,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleEntity,
    toggleBlockKind,
    toggleStatus,
    toggleScope,
    clearFilters,
  } = useUserAiContextListQuery(editor.definitions);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const displayBadges = activeFilterBadges.map((badge) => {
    if (badge.id === "search") return badge;
    if (badge.id === "sort") {
      return {
        ...badge,
        label:
          query.sort === "nameDesc"
            ? t("userAiContext.list.sortNameDesc")
            : query.sort === "updatedDesc"
              ? t("userAiContext.list.sortUpdatedDesc")
              : query.sort === "nameAsc"
                ? t("userAiContext.list.sortNameAsc")
                : t("userAiContext.list.sortOrder"),
      };
    }
    if (badge.id.startsWith("status:")) {
      return {
        ...badge,
        label: badge.id.endsWith("enabled")
          ? t("userAiContext.list.statusEnabled")
          : t("userAiContext.list.statusDisabled"),
      };
    }
    if (badge.id.startsWith("scope:")) {
      return {
        ...badge,
        label: badge.id.endsWith("tenantWide")
          ? t("userAiContext.scopes.tenantWide")
          : t("userAiContext.scopes.perUser"),
      };
    }
    if (badge.id.startsWith("blockKind:")) {
      const kind = badge.id.slice(
        "blockKind:".length,
      ) as UserAiContextBlockKindFilter;
      return {
        ...badge,
        label: t(blockKindLabelKey(kind)),
      };
    }
    return badge;
  });

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("userAiContext.list.status")}
        </Text>
        <div className="flex flex-col gap-2">
          {USER_AI_CONTEXT_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`uai-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                status === "enabled"
                  ? t("userAiContext.list.statusEnabled")
                  : t("userAiContext.list.statusDisabled")
              }
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("userAiContext.fields.scope")}
        </Text>
        <div className="flex flex-col gap-2">
          {USER_AI_CONTEXT_SCOPE_FILTERS.map((scope) => (
            <Checkbox
              key={scope}
              id={`uai-scope-${scope}`}
              checked={query.scopes.includes(scope)}
              onChange={() => toggleScope(scope)}
              label={
                scope === "tenantWide"
                  ? t("userAiContext.scopes.tenantWide")
                  : t("userAiContext.scopes.perUser")
              }
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("userAiContext.blocks.kind")}
        </Text>
        <div className="flex flex-col gap-2">
          {USER_AI_CONTEXT_BLOCK_KIND_FILTERS.map((kind) => (
            <Checkbox
              key={kind}
              id={`uai-kind-${kind}`}
              checked={query.blockKinds.includes(kind)}
              onChange={() => toggleBlockKind(kind)}
              label={t(blockKindLabelKey(kind))}
            />
          ))}
        </div>
      </div>
      {availableEntities.length > 0 ? (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("userAiContext.blocks.entity")}
          </Text>
          <div className="flex flex-col gap-2">
            {availableEntities.map((entity) => (
              <Checkbox
                key={entity}
                id={`uai-entity-${entity}`}
                checked={query.entities.includes(entity)}
                onChange={() => toggleEntity(entity)}
                label={entity}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const addRow = (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
        USER_AI_CONTEXT_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">{t("userAiContext.list.add")}</Text>
    </button>
  );

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("userAiContext.list.title")}
        expandLabel={t("userAiContext.list.expandPanel")}
        collapseLabel={t("userAiContext.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        scopeSection={
          <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
            <div className="w-full py-0.5">
              <SearchField
                value={query.search}
                onChange={setSearch}
                placeholder={t("userAiContext.list.searchPlaceholder")}
                ariaLabel={t("userAiContext.list.searchPlaceholder")}
                clearAriaLabel={t("userAiContext.list.searchClear")}
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
                    triggerLabel={t("userAiContext.list.filter")}
                    clearAllLabel={t("userAiContext.list.clearFilters")}
                    removeAriaLabel={(label) =>
                      t("userAiContext.list.removeBadge", { label })
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
                            {t("userAiContext.list.sort")}
                          </span>
                          <Select
                            selectSize="sm"
                            className="w-auto min-w-[9rem]"
                            value={query.sort}
                            onChange={(event) =>
                              setSort(
                                event.target.value as UserAiContextListSort,
                              )
                            }
                            aria-label={t("userAiContext.list.sort")}
                          >
                            <option value={DEFAULT_USER_AI_CONTEXT_LIST_SORT}>
                              {t("userAiContext.list.sortOrder")}
                            </option>
                            <option value="nameAsc">
                              {t("userAiContext.list.sortNameAsc")}
                            </option>
                            <option value="nameDesc">
                              {t("userAiContext.list.sortNameDesc")}
                            </option>
                            <option value="updatedDesc">
                              {t("userAiContext.list.sortUpdatedDesc")}
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
                clearAllLabel={t("userAiContext.list.clearFilters")}
                disabled={!hasActiveFilters}
              >
                {filterBody}
              </FilterPanelBody>
            </div>
          </div>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-1 py-1">
          {addRow}
          {listDefinitions.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {editor.definitions.length === 0
                ? t("userAiContext.list.empty")
                : t("userAiContext.list.emptyFiltered")}
            </Text>
          ) : (
            listDefinitions.map((section) => {
              const selected = section.id === editor.selectedId;
              return (
                <div
                  key={section.id}
                  role="treeitem"
                  className={cn(
                    "group/node flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-150",
                    selected
                      ? USER_AI_CONTEXT_LIST_ROW_SELECTED_CLASS
                      : USER_AI_CONTEXT_LIST_ROW_HOVER_CLASS,
                  )}
                  onClick={() => editor.setSelectedId(section.id)}
                >
                  <BookText
                    aria-hidden
                    className="text-muted-foreground ml-1 size-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1 px-1">
                    <Text className="truncate text-sm font-medium">
                      {section.name}
                    </Text>
                    <Text className="text-muted-foreground truncate text-xs">
                      {t("userAiContext.list.rowMeta", {
                        order: section.order,
                        blocks: section.blocks.length,
                        scope:
                          section.scope === "tenantWide"
                            ? t("userAiContext.scopes.tenantWide")
                            : t("userAiContext.scopes.perUser"),
                        status: section.enabled
                          ? t("userAiContext.list.statusEnabled")
                          : t("userAiContext.list.statusDisabled"),
                      })}
                    </Text>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/node:opacity-100">
                    {canUpdate ? (
                      <IconButton
                        type="button"
                        size="sm"
                        label={t("userAiContext.list.rename")}
                        onClick={(event) => {
                          event.stopPropagation();
                          requestMetadataEdit(section.id);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </IconButton>
                    ) : null}
                    {canDelete ? (
                      <IconButton
                        type="button"
                        size="sm"
                        label={t("userAiContext.list.delete")}
                        onClick={(event) => {
                          event.stopPropagation();
                          requestDelete(section.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ItemListDesignerTreePanelShell>

      <UserAiContextMetadataModal
        mode="create"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
