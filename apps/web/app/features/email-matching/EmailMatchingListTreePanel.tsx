import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  Checkbox,
  FilterPanel,
  FilterPanelBody,
  IconButton,
  SearchField,
  Text,
  toast,
  useFilterPanelDismiss,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

import { startGmailSync } from "../../lib/api-client";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";
import { EmailMatchingListBadge } from "./components/EmailMatchingListBadge";
import { EmailMatchingStatusSummary } from "./components/EmailMatchingStatusSummary";
import { bindingDisplayName } from "./email-matching-draft";
import { useEmailMatching } from "./email-matching-context";
import {
  EMAIL_MATCHING_INGEST_MODE_FILTERS,
  EMAIL_MATCHING_LIST_ROW_HOVER_CLASS,
  EMAIL_MATCHING_LIST_ROW_SELECTED_CLASS,
  EMAIL_MATCHING_STATUS_FILTERS,
  EMAIL_MATCHING_USE_AI_FILTERS,
  type EmailMatchingListSort,
  type EmailMatchingStatusFilter,
} from "./email-matching-list-styles";
import { EmailMatchingMetadataModal } from "./EmailMatchingMetadataModal";
import { useEmailMatchingListQuery } from "./use-email-matching-list-query";

export function EmailMatchingListTreePanel() {
  const { t } = useTranslation("common");
  const {
    editor,
    canCreate,
    canUpdate,
    canDelete,
    requestMetadataEdit,
    requestDelete,
  } = useEmailMatching();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [syncingBindingId, setSyncingBindingId] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const syncBindingMutation = useMutation({
    mutationFn: (bindingId: string) => startGmailSync({ bindingId }),
    onMutate: (bindingId) => {
      setSyncingBindingId(bindingId);
    },
    onSuccess: (data) => {
      toast.success(
        t("emailMatchingWorkbench.list.syncStarted", { jobId: data.jobId }),
      );
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => {
      setSyncingBindingId(null);
    },
  });

  const {
    query,
    listBindings,
    filteredBindings,
    availableEntities,
    statusCounts,
    hasActiveFilters,
    activeFilterBadges,
    setSearch,
    setSort,
    toggleStatus,
    toggleEntity,
    toggleIngestMode,
    toggleUseAi,
    clearFilters,
  } = useEmailMatchingListQuery(editor.bindings);

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, toolbarRef);

  const displayBadges = useMemo(
    () =>
      activeFilterBadges.map((badge) => {
        if (badge.id === "search") {
          return badge;
        }
        if (badge.id === "sort") {
          const sortLabel =
            query.sort === "nameDesc"
              ? t("emailMatchingWorkbench.list.sortNameDesc")
              : query.sort === "entity"
                ? t("emailMatchingWorkbench.list.sortEntity")
                : query.sort === "updatedDesc"
                  ? t("emailMatchingWorkbench.list.sortUpdatedDesc")
                  : query.sort === "orderAsc"
                    ? t("emailMatchingWorkbench.list.sortOrderAsc")
                    : t("emailMatchingWorkbench.list.sortNameAsc");
          return { ...badge, label: sortLabel };
        }
        if (badge.id.startsWith("status:")) {
          const status = badge.id.slice(
            "status:".length,
          ) as EmailMatchingStatusFilter;
          return {
            ...badge,
            label:
              status === "enabled"
                ? t("emailMatchingWorkbench.list.statusEnabled")
                : t("emailMatchingWorkbench.list.statusDisabled"),
          };
        }
        if (badge.id.startsWith("ingestMode:")) {
          const mode = badge.id.slice("ingestMode:".length);
          return {
            ...badge,
            label:
              mode === "create"
                ? t("emailMatchingWorkbench.list.ingestCreate")
                : t("emailMatchingWorkbench.list.ingestLink"),
          };
        }
        if (badge.id.startsWith("useAi:")) {
          const filter = badge.id.slice("useAi:".length);
          return {
            ...badge,
            label:
              filter === "ai"
                ? t("emailMatchingWorkbench.list.useAiOn")
                : t("emailMatchingWorkbench.list.useAiOff"),
          };
        }
        return badge;
      }),
    [activeFilterBadges, query.sort, t],
  );

  const filterBody = (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("emailMatchingWorkbench.list.filterByStatus")}
        </Text>
        <div className="flex flex-col gap-2">
          {EMAIL_MATCHING_STATUS_FILTERS.map((status) => (
            <Checkbox
              key={status}
              id={`email-matching-status-${status}`}
              checked={query.statuses.includes(status)}
              onChange={() => toggleStatus(status)}
              label={
                <span className="inline-flex items-center gap-2">
                  <EmailMatchingListBadge
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

      <div className="space-y-3">
        <Text className="text-muted-foreground text-xs font-medium">
          {t("emailMatchingWorkbench.list.filterByIngestMode")}
        </Text>
        <div className="flex flex-col gap-2">
          {EMAIL_MATCHING_INGEST_MODE_FILTERS.map((mode) => (
            <Checkbox
              key={mode}
              id={`email-matching-ingest-${mode}`}
              checked={query.ingestModes.includes(mode)}
              onChange={() => toggleIngestMode(mode)}
              label={
                <span className="inline-flex items-center gap-2">
                  <EmailMatchingListBadge
                    kind="ingestMode"
                    value={mode}
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
          {t("emailMatchingWorkbench.list.filterByUseAi")}
        </Text>
        <div className="flex flex-col gap-2">
          {EMAIL_MATCHING_USE_AI_FILTERS.map((filter) => (
            <Checkbox
              key={filter}
              id={`email-matching-ai-${filter}`}
              checked={query.useAiFilters.includes(filter)}
              onChange={() => toggleUseAi(filter)}
              label={
                <span className="inline-flex items-center gap-2">
                  <EmailMatchingListBadge
                    kind="useAi"
                    value={filter}
                    size="compact"
                  />
                </span>
              }
            />
          ))}
        </div>
      </div>

      {availableEntities.length > 0 ? (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("emailMatchingWorkbench.list.filterByEntity")}
          </Text>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {availableEntities.map((entity) => (
              <Checkbox
                key={entity}
                id={`email-matching-entity-${entity}`}
                checked={query.entities.includes(entity)}
                onChange={() => toggleEntity(entity)}
                label={
                  <span className="inline-flex items-center gap-2">
                    <EmailMatchingListBadge
                      kind="entity"
                      value={entity}
                      size="compact"
                    />
                  </span>
                }
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
        EMAIL_MATCHING_LIST_ROW_HOVER_CLASS,
      )}
      onClick={() => setCreateModalOpen(true)}
      disabled={!canCreate}
    >
      <Plus aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Text className="text-sm font-medium">
        {t("emailMatchingWorkbench.list.add")}
      </Text>
    </button>
  );

  const emptyMessage =
    editor.bindings.length === 0
      ? t("emailMatchingWorkbench.list.emptySource")
      : t("emailMatchingWorkbench.list.emptyFiltered");

  return (
    <>
      <ItemListDesignerTreePanelShell
        title={t("emailMatchingWorkbench.list.title")}
        expandLabel={t("emailMatchingWorkbench.list.expandPanel")}
        collapseLabel={t("emailMatchingWorkbench.list.collapsePanel")}
        expandedClassName={designerTreePanelShellClassName}
        collapsedClassName={designerTreePanelShellClassName}
        collapsedContent={addRow}
        scopeSection={
          <div className="flex w-full min-w-0 flex-col gap-3 px-2 pb-2">
            <div className="w-full py-0.5">
              <SearchField
                value={query.search}
                onChange={setSearch}
                placeholder={t(
                  "emailMatchingWorkbench.list.searchPlaceholder",
                )}
                ariaLabel={t("emailMatchingWorkbench.list.searchPlaceholder")}
                clearAriaLabel={t("emailMatchingWorkbench.list.searchClear")}
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
                    triggerLabel={t("emailMatchingWorkbench.list.filter")}
                    clearAllLabel={t("emailMatchingWorkbench.list.clearFilters")}
                    removeAriaLabel={(label) =>
                      t("emailMatchingWorkbench.list.removeBadge", { label })
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
                            {t("emailMatchingWorkbench.list.sort")}
                          </span>
                          <Select
                            selectSize="sm"
                            className="w-auto min-w-[9rem]"
                            value={query.sort}
                            onChange={(event) =>
                              setSort(
                                event.target.value as EmailMatchingListSort,
                              )
                            }
                            aria-label={t("emailMatchingWorkbench.list.sort")}
                          >
                            <option value="nameAsc">
                              {t("emailMatchingWorkbench.list.sortNameAsc")}
                            </option>
                            <option value="nameDesc">
                              {t("emailMatchingWorkbench.list.sortNameDesc")}
                            </option>
                            <option value="entity">
                              {t("emailMatchingWorkbench.list.sortEntity")}
                            </option>
                            <option value="updatedDesc">
                              {t(
                                "emailMatchingWorkbench.list.sortUpdatedDesc",
                              )}
                            </option>
                            <option value="orderAsc">
                              {t("emailMatchingWorkbench.list.sortOrderAsc")}
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
                clearAllLabel={t("emailMatchingWorkbench.list.clearFilters")}
                disabled={!hasActiveFilters}
              >
                {filterBody}
              </FilterPanelBody>
            </div>

            <EmailMatchingStatusSummary
              statusCounts={statusCounts}
              total={filteredBindings.length}
            />
          </div>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-1 py-1">
          {addRow}
          {listBindings.length === 0 ? (
            <Text className="text-muted-foreground px-2 py-3 text-sm">
              {emptyMessage}
            </Text>
          ) : (
            listBindings.map((binding) => {
              const isSelected = editor.selectedId === binding.id;
              const status: EmailMatchingStatusFilter = binding.enabled
                ? "enabled"
                : "disabled";

              return (
                <div
                  key={binding.id}
                  role="treeitem"
                  className={cn(
                    "group/node flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-150",
                    isSelected
                      ? EMAIL_MATCHING_LIST_ROW_SELECTED_CLASS
                      : EMAIL_MATCHING_LIST_ROW_HOVER_CLASS,
                  )}
                  onClick={() => editor.setSelectedId(binding.id)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2 px-2">
                    <Mail
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        binding.enabled
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                      )}
                    />
                    <div className="min-w-0 space-y-1">
                      <Text className="break-words text-sm font-medium">
                        {bindingDisplayName(binding)}
                      </Text>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <EmailMatchingListBadge
                          kind="status"
                          value={status}
                          size="compact"
                        />
                        <EmailMatchingListBadge
                          kind="ingestMode"
                          value={binding.ingestMode ?? "create"}
                          size="compact"
                        />
                        <EmailMatchingListBadge
                          kind="useAi"
                          value={binding.useAi ? "ai" : "rules"}
                          size="compact"
                        />
                        <EmailMatchingListBadge
                          kind="entity"
                          value={binding.entityName}
                          size="compact"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/node:opacity-100">
                    <IconButton
                      type="button"
                      size="sm"
                      label={
                        binding.enabled
                          ? t("emailMatchingWorkbench.list.syncNow")
                          : t("emailMatchingWorkbench.list.syncDisabled")
                      }
                      disabled={
                        !binding.enabled ||
                        syncBindingMutation.isPending ||
                        syncingBindingId === binding.id
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!binding.enabled) {
                          toast.error(
                            t("emailMatchingWorkbench.list.syncDisabled"),
                          );
                          return;
                        }
                        syncBindingMutation.mutate(binding.id);
                      }}
                    >
                      <RefreshCw
                        aria-hidden
                        className={cn(
                          "size-4",
                          syncingBindingId === binding.id && "animate-spin",
                        )}
                      />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("emailMatchingWorkbench.list.edit")}
                      disabled={!canUpdate}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestMetadataEdit(binding.id);
                      }}
                    >
                      <Pencil aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton
                      type="button"
                      size="sm"
                      label={t("emailMatchingWorkbench.list.delete")}
                      disabled={!canDelete}
                      onClick={(event) => {
                        event.stopPropagation();
                        requestDelete(binding.id);
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

      <EmailMatchingMetadataModal
        mode="create"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
