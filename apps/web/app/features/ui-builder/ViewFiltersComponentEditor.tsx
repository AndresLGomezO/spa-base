import type {
  UiComponentConfig,
  ViewFilterEntry,
  ViewFiltersComponentConfig,
} from "@repo/ui-builder-core";
import { CollapsibleEditorCard, LabelConfigEditor } from "@repo/ui-builder-react";
import { Button, IconButton, Popover } from "@repo/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  isViewFilterEntryAdded,
  toViewFilterEntryKey,
} from "./collect-view-available-filter-options";
import {
  isValidFilterEntry,
  PencilIcon,
  PlusIcon,
  resolveFilterEntryLabels,
  TrashIcon,
  VIEW_FILTER_EDITOR_POPOVER_PANEL_CLASS,
  ViewFilterEntryFields,
} from "./view-filter-entry-editor-shared";

interface ViewFiltersComponentEditorProps {
  readonly config: ViewFiltersComponentConfig;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly onChange: (config: UiComponentConfig) => void;
}

export function ViewFiltersComponentEditor({
  config,
  catalog,
  onChange,
}: ViewFiltersComponentEditorProps) {
  const { t } = useTranslation("common");
  const [cardOpen, setCardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<ViewFilterEntry | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ViewFilterEntry | null>(null);

  const activeFilters = config.filters;

  const updateFilters = (filters: readonly ViewFilterEntry[]) => {
    onChange({
      ...config,
      filters: [...filters],
    });
  };

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (open) {
      setCardOpen(true);
      setEditingIndex(null);
      setEditDraft(null);
      setAddDraft({ entityName: "", fieldName: "" });
      return;
    }
    setAddDraft(null);
  };

  const confirmAdd = () => {
    if (!addDraft || !isValidFilterEntry(addDraft)) {
      return;
    }

    if (isViewFilterEntryAdded(addDraft, activeFilters)) {
      return;
    }

    updateFilters([...activeFilters, addDraft]);
    setAddOpen(false);
    setAddDraft(null);
  };

  const handleEditOpenChange = (index: number, open: boolean) => {
    if (open) {
      setCardOpen(true);
      setAddOpen(false);
      setAddDraft(null);
      setEditingIndex(index);
      setEditDraft({ ...activeFilters[index]! });
      return;
    }
    setEditingIndex(null);
    setEditDraft(null);
  };

  const confirmEdit = (index: number) => {
    if (!editDraft || !isValidFilterEntry(editDraft)) {
      return;
    }

    const otherFilters = activeFilters.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    if (isViewFilterEntryAdded(editDraft, otherFilters)) {
      return;
    }

    updateFilters(
      activeFilters.map((entry, itemIndex) =>
        itemIndex === index ? editDraft : entry,
      ),
    );
    setEditingIndex(null);
    setEditDraft(null);
  };

  const removeFilter = (index: number) => {
    updateFilters(activeFilters.filter((_, itemIndex) => itemIndex !== index));
  };

  const addTrigger = (
    <Popover
      open={addOpen}
      onOpenChange={handleAddOpenChange}
      layer="elevated"
      placement="right-start"
      title={t("viewFilterComponents.addFilter")}
      panelClassName={VIEW_FILTER_EDITOR_POPOVER_PANEL_CLASS}
      trigger={
        <IconButton
          type="button"
          label={t("viewFilterComponents.addFilter")}
          size="sm"
        >
          <PlusIcon />
        </IconButton>
      }
    >
      {addDraft ? (
        <>
          <ViewFilterEntryFields
            draft={addDraft}
            catalog={catalog}
            onChange={setAddDraft}
          />
          <div className="flex items-center justify-end gap-2">
            <IconButton
              type="button"
              label={t("viewFilterComponents.removeFilter")}
              size="sm"
              onClick={() => setAddOpen(false)}
            >
              <TrashIcon />
            </IconButton>
            <Button
              type="button"
              size="sm"
              disabled={!isValidFilterEntry(addDraft)}
              onClick={confirmAdd}
            >
              {t("viewFilterComponents.addFilter")}
            </Button>
          </div>
        </>
      ) : null}
    </Popover>
  );

  return (
    <div className="flex flex-col gap-3">
      <LabelConfigEditor
        label={config.label ?? { show: false }}
        onChange={(label) => onChange({ ...config, label })}
        labels={{
          showLabel: t("entity.viewSettings.showLabel"),
          label: t("viewFilterComponents.filtersLabel"),
          labelPosition: t("entity.viewSettings.labelPosition"),
          labelAbove: t("entity.viewSettings.labelAbove"),
          labelBelow: t("entity.viewSettings.labelBelow"),
          labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
          labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
          labelAlignRight: t("entity.viewSettings.labelAlignRight"),
          labelColor: t("entity.viewSettings.labelColor"),
        }}
      />
      <CollapsibleEditorCard
        title={t("viewFilterComponents.activeFilters")}
        open={cardOpen}
        onOpenChange={setCardOpen}
        addTrigger={addTrigger}
      >
        <div className="max-h-48 overflow-y-auto rounded-lg bg-background/60 shadow-inner">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  {t("viewFilterComponents.tableEntity")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("viewFilterComponents.tableField")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">
                    {t("viewFilterComponents.tableActions")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {activeFilters.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="text-muted-foreground px-3 py-4 text-center"
                  >
                    —
                  </td>
                </tr>
              ) : (
                activeFilters.map((entry, index) => {
                  const labels = resolveFilterEntryLabels(entry, catalog);

                  return (
                    <tr
                      key={toViewFilterEntryKey(entry)}
                      className="even:bg-muted/15 hover:bg-primary/5 transition-colors duration-150"
                    >
                      <td className="px-3 py-2">{labels.entityLabel}</td>
                      <td className="text-muted-foreground px-3 py-2">
                        {labels.fieldLabel}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Popover
                            open={editingIndex === index}
                            onOpenChange={(open) =>
                              handleEditOpenChange(index, open)
                            }
                            layer="elevated"
                            placement="right-start"
                            title={t("viewFilterComponents.saveFilter")}
                            panelClassName={VIEW_FILTER_EDITOR_POPOVER_PANEL_CLASS}
                            trigger={
                              <IconButton
                                type="button"
                                label={t("viewFilterComponents.saveFilter")}
                                size="sm"
                              >
                                <PencilIcon />
                              </IconButton>
                            }
                          >
                            {editDraft && editingIndex === index ? (
                              <>
                                <ViewFilterEntryFields
                                  draft={editDraft}
                                  catalog={catalog}
                                  onChange={setEditDraft}
                                />
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={!isValidFilterEntry(editDraft)}
                                    onClick={() => confirmEdit(index)}
                                  >
                                    {t("viewFilterComponents.saveFilter")}
                                  </Button>
                                </div>
                              </>
                            ) : null}
                          </Popover>
                          <IconButton
                            type="button"
                            label={t("viewFilterComponents.removeFilter")}
                            size="sm"
                            onClick={() => removeFilter(index)}
                          >
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleEditorCard>
    </div>
  );
}
