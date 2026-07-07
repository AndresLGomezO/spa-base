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
  createEmptyEntityQueryAggregationRow,
  createEmptyEntityQueryParameterRow,
  listEntityQueryGroupSortFieldOptions,
  type EntityQueryAggregationEditorRow,
  type EntityQueryParameterEditorRow,
} from "../../components/entity/entity-query-aggregation-editor-utils";
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
import { EntityQueryRunResultsPanel } from "./EntityQueryRunResultsPanel";
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

function updateAggregationRow(
  rows: readonly EntityQueryAggregationEditorRow[],
  id: string,
  patch: Partial<EntityQueryAggregationEditorRow>,
): EntityQueryAggregationEditorRow[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function updateParameterRow(
  rows: readonly EntityQueryParameterEditorRow[],
  id: string,
  patch: Partial<EntityQueryParameterEditorRow>,
): EntityQueryParameterEditorRow[] {
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

  const groupByFieldOptions = useMemo(() => {
    return sortFieldOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }, [sortFieldOptions]);

  const groupSortFieldOptions = useMemo(() => {
    if (!editor.draft) {
      return [];
    }
    return listEntityQueryGroupSortFieldOptions({
      groupBy: editor.draft.groupBy,
      aggregations: editor.draft.aggregations,
    });
  }, [editor.draft]);

  const isAggregated = editor.draft?.queryMode === "aggregated";

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
      queryMode: imported.queryMode,
      parameters: [...imported.parameters],
      filter: imported.filter,
      sort: [...imported.sort],
      select: [...imported.select],
      groupBy: [...imported.groupBy],
      aggregations: [...imported.aggregations],
      groupSort: [...imported.groupSort],
      groupLimit: imported.groupLimit,
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
              queryMode: editor.draft.queryMode,
              parameters: editor.draft.parameters,
              filter: editor.draft.filter,
              sort: editor.draft.sort,
              select: editor.draft.select,
              groupBy: editor.draft.groupBy,
              aggregations: editor.draft.aggregations,
              groupSort: editor.draft.groupSort,
              groupLimit: editor.draft.groupLimit,
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
            {t("queryBuilder.queryMode.label")}
          </Text>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="query-mode"
                checked={editor.draft.queryMode === "records"}
                disabled={!canUpdate}
                onChange={() => editor.updateDraft({ queryMode: "records" })}
              />
              {t("queryBuilder.queryMode.records")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="query-mode"
                checked={editor.draft.queryMode === "aggregated"}
                disabled={!canUpdate}
                onChange={() => editor.updateDraft({ queryMode: "aggregated" })}
              />
              {t("queryBuilder.queryMode.aggregated")}
            </label>
          </div>
          {isAggregated ? (
            <Text className="text-muted-foreground text-sm">
              {t("queryBuilder.queryMode.aggregatedHint")}
            </Text>
          ) : null}
        </div>

        <div className="space-y-3">
          <Text className="text-sm font-medium">
            {t("queryBuilder.parameters.label")}
          </Text>
          {editor.draft.parameters.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t("queryBuilder.parameters.empty")}
            </Text>
          ) : (
            <div className="space-y-3">
              {editor.draft.parameters.map((row, index) => (
                <div
                  key={row.id}
                  className="border-border grid gap-2 rounded-md border p-3 sm:grid-cols-2"
                >
                  <Input
                    value={row.name}
                    disabled={!canUpdate}
                    placeholder={t("queryBuilder.parameters.namePlaceholder")}
                    onChange={(event) =>
                      editor.updateDraft({
                        parameters: updateParameterRow(
                          editor.draft!.parameters,
                          row.id,
                          { name: event.target.value },
                        ),
                      })
                    }
                  />
                  <Select
                    className={selectClassName}
                    value={row.valueType}
                    disabled={!canUpdate}
                    onChange={(event) =>
                      editor.updateDraft({
                        parameters: updateParameterRow(
                          editor.draft!.parameters,
                          row.id,
                          {
                            valueType: event.target.value as
                              | "dateBucket"
                              | "scalar"
                              | "stringList",
                          },
                        ),
                      })
                    }
                  >
                    <option value="dateBucket">
                      {t("queryBuilder.parameters.valueTypes.dateBucket")}
                    </option>
                    <option value="scalar">
                      {t("queryBuilder.parameters.valueTypes.scalar")}
                    </option>
                    <option value="stringList">
                      {t("queryBuilder.parameters.valueTypes.stringList")}
                    </option>
                  </Select>
                  {row.valueType === "dateBucket" ? (
                    <>
                      <Select
                        className={selectClassName}
                        value={row.granularity || "month"}
                        disabled={!canUpdate}
                        onChange={(event) =>
                          editor.updateDraft({
                            parameters: updateParameterRow(
                              editor.draft!.parameters,
                              row.id,
                              {
                                granularity: event.target.value as
                                  | "day"
                                  | "month"
                                  | "year",
                              },
                            ),
                          })
                        }
                      >
                        <option value="day">
                          {t("queryBuilder.parameters.granularity.day")}
                        </option>
                        <option value="month">
                          {t("queryBuilder.parameters.granularity.month")}
                        </option>
                        <option value="year">
                          {t("queryBuilder.parameters.granularity.year")}
                        </option>
                      </Select>
                      <Input
                        value={row.field}
                        disabled={!canUpdate}
                        placeholder={t(
                          "queryBuilder.parameters.fieldPlaceholder",
                        )}
                        onChange={(event) =>
                          editor.updateDraft({
                            parameters: updateParameterRow(
                              editor.draft!.parameters,
                              row.id,
                              { field: event.target.value },
                            ),
                          })
                        }
                      />
                    </>
                  ) : null}
                  <div className="flex items-center justify-between sm:col-span-2">
                    <Text className="text-muted-foreground text-xs">
                      {t("queryBuilder.parameters.rowLabel", {
                        index: index + 1,
                      })}
                    </Text>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canUpdate}
                      onClick={() =>
                        editor.updateDraft({
                          parameters: editor.draft!.parameters.filter(
                            (entry) => entry.id !== row.id,
                          ),
                        })
                      }
                    >
                      {t("queryBuilder.parameters.remove")}
                    </Button>
                  </div>
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
                parameters: [
                  ...editor.draft!.parameters,
                  createEmptyEntityQueryParameterRow(),
                ],
              })
            }
          >
            {t("queryBuilder.parameters.add")}
          </Button>
        </div>

        {isAggregated ? (
          <>
            <div className="space-y-1">
              <FieldLabel>{t("queryBuilder.groupBy.label")}</FieldLabel>
              <SearchableMultiSelectDropdown
                options={groupByFieldOptions}
                selected={editor.draft.groupBy}
                onChange={(values) => editor.updateDraft({ groupBy: values })}
                disabled={!canUpdate}
                ariaLabel={t("queryBuilder.groupBy.label")}
                placeholder={t("queryBuilder.groupBy.placeholder")}
                selectedCountLabel={(count) =>
                  t("queryBuilder.groupBy.selectedCount", { count })
                }
                searchPlaceholder={t("queryBuilder.groupBy.searchPlaceholder")}
                noResultsLabel={t("queryBuilder.groupBy.noResults")}
                removeAriaLabel={(label) =>
                  t("queryBuilder.groupBy.removeBadge", { label })
                }
              />
            </div>

            <div className="space-y-3">
              <Text className="text-sm font-medium">
                {t("queryBuilder.aggregations.label")}
              </Text>
              {editor.draft.aggregations.length === 0 ? (
                <Text className="text-muted-foreground text-sm">
                  {t("queryBuilder.aggregations.empty")}
                </Text>
              ) : (
                <div className="space-y-3">
                  {editor.draft.aggregations.map((row, index) => (
                    <div
                      key={row.id}
                      className="border-border grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <Select
                        className={selectClassName}
                        value={row.operation}
                        disabled={!canUpdate}
                        onChange={(event) =>
                          editor.updateDraft({
                            aggregations: updateAggregationRow(
                              editor.draft!.aggregations,
                              row.id,
                              {
                                operation: event.target.value as
                                  | "SUM"
                                  | "COUNT"
                                  | "AVG",
                              },
                            ),
                          })
                        }
                      >
                        <option value="SUM">
                          {t("queryBuilder.aggregations.operations.SUM")}
                        </option>
                        <option value="COUNT">
                          {t("queryBuilder.aggregations.operations.COUNT")}
                        </option>
                        <option value="AVG">
                          {t("queryBuilder.aggregations.operations.AVG")}
                        </option>
                      </Select>
                      <Select
                        className={selectClassName}
                        value={row.field}
                        disabled={!canUpdate || row.operation === "COUNT"}
                        onChange={(event) =>
                          editor.updateDraft({
                            aggregations: updateAggregationRow(
                              editor.draft!.aggregations,
                              row.id,
                              { field: event.target.value },
                            ),
                          })
                        }
                      >
                        <option value="">
                          {row.operation === "COUNT"
                            ? t("queryBuilder.aggregations.countDocuments")
                            : t("queryBuilder.selectField")}
                        </option>
                        {selectFieldOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canUpdate}
                        onClick={() =>
                          editor.updateDraft({
                            aggregations: editor.draft!.aggregations.filter(
                              (entry) => entry.id !== row.id,
                            ),
                          })
                        }
                      >
                        {t("queryBuilder.aggregations.remove")}
                      </Button>
                      <Text className="text-muted-foreground text-xs sm:col-span-3">
                        {t("queryBuilder.aggregations.rowLabel", {
                          index: index + 1,
                        })}
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
                    aggregations: [
                      ...editor.draft!.aggregations,
                      createEmptyEntityQueryAggregationRow(),
                    ],
                  })
                }
              >
                {t("queryBuilder.aggregations.add")}
              </Button>
            </div>

            <div className="space-y-3">
              <Text className="text-sm font-medium">
                {t("queryBuilder.groupSort.label")}
              </Text>
              {editor.draft.groupSort.length === 0 ? (
                <Text className="text-muted-foreground text-sm">
                  {t("queryBuilder.groupSort.empty")}
                </Text>
              ) : (
                <div className="space-y-3">
                  {editor.draft.groupSort.map((row, index) => (
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
                            groupSort: updateSortRow(
                              editor.draft!.groupSort,
                              row.id,
                              { field: event.target.value },
                            ),
                          })
                        }
                      >
                        <option value="">
                          {t("queryBuilder.selectField")}
                        </option>
                        {groupSortFieldOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Select
                        className={selectClassName}
                        value={row.direction}
                        disabled={!canUpdate}
                        onChange={(event) =>
                          editor.updateDraft({
                            groupSort: updateSortRow(
                              editor.draft!.groupSort,
                              row.id,
                              {
                                direction: event.target.value as "asc" | "desc",
                              },
                            ),
                          })
                        }
                      >
                        <option value="asc">
                          {t("queryBuilder.sort.asc")}
                        </option>
                        <option value="desc">
                          {t("queryBuilder.sort.desc")}
                        </option>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canUpdate}
                        onClick={() =>
                          editor.updateDraft({
                            groupSort: editor.draft!.groupSort.filter(
                              (entry) => entry.id !== row.id,
                            ),
                          })
                        }
                      >
                        {t("queryBuilder.groupSort.remove")}
                      </Button>
                      <Text className="text-muted-foreground text-xs sm:col-span-3">
                        {t("queryBuilder.groupSort.rowLabel", {
                          index: index + 1,
                        })}
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
                    groupSort: [
                      ...editor.draft!.groupSort,
                      createEmptyEntityQuerySortRow(),
                    ],
                  })
                }
              >
                {t("queryBuilder.groupSort.add")}
              </Button>
            </div>

            <div className="space-y-1">
              <FieldLabel>{t("queryBuilder.groupLimit.label")}</FieldLabel>
              <Input
                type="number"
                min={1}
                max={100}
                value={editor.draft.groupLimit ?? ""}
                disabled={!canUpdate}
                placeholder={t("queryBuilder.groupLimit.placeholder")}
                onChange={(event) =>
                  editor.updateDraft({
                    groupLimit:
                      event.target.value.trim().length > 0
                        ? Number(event.target.value) || 1
                        : undefined,
                  })
                }
              />
            </div>
          </>
        ) : null}

        {!isAggregated ? (
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
                        <optgroup
                          label={t("queryBuilder.filters.relationGroup")}
                        >
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
                      <option value="desc">
                        {t("queryBuilder.sort.desc")}
                      </option>
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
                  sort: [
                    ...editor.draft!.sort,
                    createEmptyEntityQuerySortRow(),
                  ],
                })
              }
            >
              {t("queryBuilder.sort.add")}
            </Button>
          </div>
        ) : null}

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

        {!isAggregated ? (
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
        ) : (
          <Text className="text-muted-foreground text-sm">
            {t("queryBuilder.limit.aggregatedHint")}
          </Text>
        )}

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

        <EntityQueryRunResultsPanel />
      </div>
    </div>
  );
}
