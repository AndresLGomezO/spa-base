import type {
  UiComponentConfig,
  ViewFilterComponentConfig,
  ViewFilterEntry,
} from "@repo/ui-builder-core";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { Button, FieldLabel, IconButton, Popover, Select } from "@repo/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  formatFieldLabel,
  getEntityLabel,
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import {
  isViewFilterEntryAdded,
  toViewFilterEntryKey,
} from "./collect-view-available-filter-options";
import { resolveAvailableViewFilterFieldNames } from "./resolve-view-filter-field-names";

interface ViewFilterComponentEditorProps {
  readonly config: ViewFilterComponentConfig;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly onChange: (config: UiComponentConfig) => void;
}

const POPOVER_PANEL_CLASS = "w-72 min-w-[18rem]";

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

interface ViewFilterEntryFieldsProps {
  readonly draft: ViewFilterEntry;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly onChange: (draft: ViewFilterEntry) => void;
}

function ViewFilterEntryFields({
  draft,
  catalog,
  onChange,
}: ViewFilterEntryFieldsProps) {
  const { t } = useTranslation("common");

  const entityOptions = useMemo(
    () =>
      [...catalog]
        .map((definition) => ({
          value: definition.name,
          label: getEntityLabel(definition),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [catalog],
  );

  const selectedDefinition = useMemo(
    () => tryGetEntityDefinition(draft.entityName, catalog),
    [catalog, draft.entityName],
  );

  const fieldOptions = useMemo(() => {
    if (!selectedDefinition) {
      return [];
    }

    return resolveAvailableViewFilterFieldNames(selectedDefinition).map(
      (fieldName) => ({
        value: fieldName,
        label: formatFieldLabel(fieldName, selectedDefinition),
      }),
    );
  }, [selectedDefinition]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <FieldLabel>{t("viewFilterComponents.tableEntity")}</FieldLabel>
        <Select
          value={draft.entityName}
          onChange={(event) =>
            onChange({
              entityName: event.target.value,
              fieldName: "",
            })
          }
        >
          <option value="" disabled>
            {t("viewFilterComponents.selectEntity")}
          </option>
          {entityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <FieldLabel>{t("viewFilterComponents.tableField")}</FieldLabel>
        <Select
          value={draft.fieldName}
          disabled={!selectedDefinition || fieldOptions.length === 0}
          onChange={(event) =>
            onChange({
              ...draft,
              fieldName: event.target.value,
            })
          }
        >
          <option value="" disabled>
            {t("viewFilterComponents.selectField")}
          </option>
          {fieldOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

function resolveFilterEntryLabels(
  entry: ViewFilterEntry,
  catalog: readonly EntityCatalogEntry[],
): { readonly entityLabel: string; readonly fieldLabel: string } {
  const definition = tryGetEntityDefinition(entry.entityName, catalog);

  return {
    entityLabel: definition ? getEntityLabel(definition) : entry.entityName,
    fieldLabel: definition
      ? formatFieldLabel(entry.fieldName, definition)
      : entry.fieldName,
  };
}

function isValidFilterEntry(entry: ViewFilterEntry): boolean {
  return (
    entry.entityName.trim().length > 0 && entry.fieldName.trim().length > 0
  );
}

export function ViewFilterComponentEditor({
  config,
  catalog,
  onChange,
}: ViewFilterComponentEditorProps) {
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
      panelClassName={POPOVER_PANEL_CLASS}
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
                          panelClassName={POPOVER_PANEL_CLASS}
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
  );
}
