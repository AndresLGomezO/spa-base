import type { ViewFilterEntry } from "@repo/ui-builder-core";
import { FieldLabel } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  formatFieldLabel,
  getEntityLabel,
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import { resolveAvailableViewFilterFieldNames } from "./resolve-view-filter-field-names";

export const VIEW_FILTER_EDITOR_POPOVER_PANEL_CLASS = "w-72 min-w-[18rem]";

export function PlusIcon() {
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

export function PencilIcon() {
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

export function TrashIcon() {
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

export function ViewFilterEntryFields({
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

export function resolveFilterEntryLabels(
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

export function isValidFilterEntry(entry: ViewFilterEntry): boolean {
  return (
    entry.entityName.trim().length > 0 && entry.fieldName.trim().length > 0
  );
}
