import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  FieldLabel,
  Input,
  SearchableMultiSelectDropdown,
  Select,
  Text,
  toast,
} from "@repo/ui";

import { EntityQueryFiltersEditor } from "../../components/entity/EntityQueryFiltersEditor";
import {
  createEmptyEntityQuerySortRow,
  listEntityQueryFilterFieldOptions,
  type EntityQuerySortEditorRow,
} from "../../components/entity/entity-query-filter-utils";
import {
  formatFieldLabel,
  getEntityLabel,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { EntityQueryPreviewPanel } from "./EntityQueryPreviewPanel";
import { useEntityQueryBuilder } from "./entity-query-builder-context";
import { EntityQueryDefinitionJsonToolbar } from "./json/EntityQueryDefinitionJsonToolbar";
import { entityQueryDefinitionFormJsonLabels } from "./json/entity-query-definition-json-labels";
import type { EntityQueryFormStateImportResult } from "./json/export-entity-query-form-state";

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

function updateSortRow(
  rows: readonly EntityQuerySortEditorRow[],
  id: string,
  patch: Partial<EntityQuerySortEditorRow>,
): EntityQuerySortEditorRow[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export function EntityQuerySettingsPanel() {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const { editor, canUpdate } = useEntityQueryBuilder();
  const jsonLabels = useMemo(() => entityQueryDefinitionFormJsonLabels(t), [t]);

  const entity = useMemo(
    () =>
      entities.find(
        (entry) => entry.name === editor.selectedDefinition?.sourceEntity,
      ),
    [entities, editor.selectedDefinition?.sourceEntity],
  );

  const sortFieldOptions = useMemo(() => {
    if (!entity) {
      return [];
    }
    return listEntityQueryFilterFieldOptions(entity, entities);
  }, [entity, entities]);

  const selectFieldOptions = useMemo(() => {
    if (!entity) {
      return [];
    }
    return Object.keys(entity.fields)
      .sort((left, right) => left.localeCompare(right))
      .map((field) => ({
        value: field,
        label: formatFieldLabel(field, entity),
      }));
  }, [entity]);

  if (!editor.selectedDefinition || !editor.draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("queryBuilder.settings.emptySelection")}
        </Text>
      </div>
    );
  }

  const handleSave = async () => {
    const error = await editor.saveSelectedQuery();
    if (!error) {
      toast.success(t("queryBuilder.saved"));
    } else {
      toast.error(error);
    }
  };

  const handleJsonImport = (imported: EntityQueryFormStateImportResult) => {
    editor.updateDraft({
      ...(imported.description !== undefined
        ? { description: imported.description }
        : {}),
      filter: imported.filter,
      sort: [...imported.sort],
      select: [...imported.select],
      limitMode: imported.limitMode,
      limit: imported.limit,
      status: imported.status,
    });
  };

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName} gap-4`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="space-y-1">
          <Text className="text-base font-semibold">
            {editor.selectedDefinition.name}
          </Text>
          {editor.selectedDefinition.description ? (
            <Text className="text-muted-foreground text-sm">
              {editor.selectedDefinition.description}
            </Text>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EntityQueryDefinitionJsonToolbar
            existingName={editor.selectedDefinition.name}
            existingSourceEntity={editor.selectedDefinition.sourceEntity}
            canApply={canUpdate}
            labels={jsonLabels}
            formState={{
              name: editor.selectedDefinition.name,
              description: editor.draft.description,
              sourceEntity: editor.selectedDefinition.sourceEntity,
              filter: editor.draft.filter,
              sort: editor.draft.sort,
              select: editor.draft.select,
              limitMode: editor.draft.limitMode,
              limit: editor.draft.limit,
              status: editor.draft.status,
            }}
            onImport={handleJsonImport}
          />
          <Button
            type="button"
            loading={editor.isSaving}
            disabled={!canUpdate || !editor.isDirty}
            onClick={() => void handleSave()}
          >
            {t("queryBuilder.save")}
          </Button>
        </div>
      </div>

      <div className={`${designerPreviewPanelBodyFillClassName} space-y-6`}>
        <div className="space-y-1">
          <Text className="text-muted-foreground text-xs">
            {t("queryBuilder.metadata.sourceEntity")}
          </Text>
          <Text className="text-sm">
            {entity
              ? getEntityLabel(entity)
              : editor.selectedDefinition.sourceEntity}
          </Text>
        </div>

        <EntityQueryFiltersEditor
          entity={entity}
          catalog={entities}
          filterRoot={editor.draft.filter}
          disabled={!canUpdate}
          onChange={(filter) => editor.updateDraft({ filter })}
        />

        <div className="space-y-3">
          <Text className="text-sm font-medium">
            {t("queryBuilder.sort.label")}
          </Text>
          {editor.draft.sort.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t("queryBuilder.sort.empty")}
            </Text>
          ) : (
            <div className="space-y-3">
              {editor.draft.sort.map((row, index) => (
                <div
                  key={row.id}
                  className="border-border grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Select
                    className={selectClassName}
                    value={row.field}
                    disabled={!canUpdate}
                    onChange={(event) =>
                      editor.updateDraft({
                        sort: updateSortRow(editor.draft!.sort, row.id, {
                          field: event.target.value,
                        }),
                      })
                    }
                  >
                    <option value="">{t("queryBuilder.selectField")}</option>
                    {sortFieldOptions.filter(
                      (option) => option.group === "direct",
                    ).length > 0 ? (
                      <optgroup label={t("queryBuilder.filters.directGroup")}>
                        {sortFieldOptions
                          .filter((option) => option.group === "direct")
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                    ) : null}
                    {sortFieldOptions.filter(
                      (option) => option.group === "relation",
                    ).length > 0 ? (
                      <optgroup label={t("queryBuilder.filters.relationGroup")}>
                        {sortFieldOptions
                          .filter((option) => option.group === "relation")
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </optgroup>
                    ) : null}
                  </Select>
                  <Select
                    className={selectClassName}
                    value={row.direction}
                    disabled={!canUpdate}
                    onChange={(event) =>
                      editor.updateDraft({
                        sort: updateSortRow(editor.draft!.sort, row.id, {
                          direction: event.target.value as "asc" | "desc",
                        }),
                      })
                    }
                  >
                    <option value="asc">{t("queryBuilder.sort.asc")}</option>
                    <option value="desc">{t("queryBuilder.sort.desc")}</option>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canUpdate}
                    onClick={() =>
                      editor.updateDraft({
                        sort: editor.draft!.sort.filter(
                          (entry) => entry.id !== row.id,
                        ),
                      })
                    }
                  >
                    {t("queryBuilder.sort.remove")}
                  </Button>
                  <Text className="text-muted-foreground text-xs sm:col-span-3">
                    {t("queryBuilder.sort.rowLabel", { index: index + 1 })}
                  </Text>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUpdate}
            onClick={() =>
              editor.updateDraft({
                sort: [...editor.draft!.sort, createEmptyEntityQuerySortRow()],
              })
            }
          >
            {t("queryBuilder.sort.add")}
          </Button>
        </div>

        <div className="space-y-1">
          <FieldLabel>{t("queryBuilder.selectFields.label")}</FieldLabel>
          <SearchableMultiSelectDropdown
            options={selectFieldOptions}
            selected={editor.draft.select}
            onChange={(values) => editor.updateDraft({ select: values })}
            disabled={!canUpdate}
            ariaLabel={t("queryBuilder.selectFields.label")}
            placeholder={t("queryBuilder.selectFields.placeholder")}
            selectedCountLabel={(count) =>
              t("queryBuilder.selectFields.selectedCount", { count })
            }
            searchPlaceholder={t("queryBuilder.selectFields.searchPlaceholder")}
            noResultsLabel={t("queryBuilder.selectFields.noResults")}
            removeAriaLabel={(label) =>
              t("queryBuilder.selectFields.removeBadge", { label })
            }
          />
        </div>

        <div className="space-y-3">
          <Text className="text-sm font-medium">
            {t("queryBuilder.limit.label")}
          </Text>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="limit-mode"
                checked={editor.draft.limitMode === "topN"}
                disabled={!canUpdate}
                onChange={() => editor.updateDraft({ limitMode: "topN" })}
              />
              {t("queryBuilder.limit.topN")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="limit-mode"
                checked={editor.draft.limitMode === "all"}
                disabled={!canUpdate}
                onChange={() => editor.updateDraft({ limitMode: "all" })}
              />
              {t("queryBuilder.limit.all")}
            </label>
          </div>
          {editor.draft.limitMode === "topN" ? (
            <Input
              type="number"
              min={1}
              max={100}
              value={editor.draft.limit}
              disabled={!canUpdate}
              onChange={(event) =>
                editor.updateDraft({
                  limit: Number(event.target.value) || 1,
                })
              }
            />
          ) : (
            <Text className="text-muted-foreground text-sm">
              {t("queryBuilder.limit.allHint")}
            </Text>
          )}
        </div>

        <div className="space-y-1">
          <FieldLabel>{t("queryBuilder.status")}</FieldLabel>
          <Select
            className={selectClassName}
            value={editor.draft.status}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({
                status: event.target.value as "ACTIVE" | "PAUSED",
              })
            }
          >
            <option value="ACTIVE">
              {t("queryBuilder.statusValues.ACTIVE")}
            </option>
            <option value="PAUSED">
              {t("queryBuilder.statusValues.PAUSED")}
            </option>
          </Select>
        </div>

        <EntityQueryPreviewPanel />
      </div>
    </div>
  );
}
