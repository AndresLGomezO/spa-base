import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Button, Input, Select, Text } from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { EntityFieldConditionValueInput } from "./EntityFieldConditionValueInput";
import {
  addChildToEditorGroup,
  createEmptyEntityQueryFilterCondition,
  createEmptyEntityQueryFilterGroup,
  ENTITY_QUERY_TEMPORAL_PRESET_OPTIONS,
  getQueryFilterAllowedOperators,
  type EntityQueryFilterEditorCondition,
  type EntityQueryFilterEditorGroup,
  isDateLikeFieldType,
  listEntityQueryFilterFieldOptions,
  removeEditorNode,
  resolveQueryFilterFieldMeta,
  updateEditorNode,
} from "./entity-query-filter-utils";

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

function formatConditionValueSummary(
  node: EntityQueryFilterEditorCondition,
  t: TFunction<"common">,
): string {
  if (node.valueKind === "temporal") {
    return t(`queryBuilder.filters.temporalPresets.${node.temporalPreset}`);
  }
  if (node.operator === "in") {
    const values =
      node.listValues.length > 0
        ? node.listValues
        : node.scalarValue
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
    return values.length > 0 ? values.join(", ") : "—";
  }
  return node.scalarValue.trim().length > 0 ? node.scalarValue : "—";
}

function formatConditionSummary(
  node: EntityQueryFilterEditorCondition,
  fieldLabel: string,
  t: TFunction<"common">,
): string {
  if (node.field.trim().length === 0) {
    return t("queryBuilder.filters.emptyConditionSummary");
  }
  const operatorLabel = t(`queryBuilder.filters.operators.${node.operator}`);
  const valueLabel = formatConditionValueSummary(node, t);
  return `${fieldLabel} ${operatorLabel} ${valueLabel}`;
}

function countFilterGroupChildren(group: EntityQueryFilterEditorGroup): number {
  return group.children.length;
}

function FilterCollapsibleHeader({
  expanded,
  onToggle,
  title,
  summary,
  actions,
}: {
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly title: string;
  readonly summary?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-2 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 space-y-0.5">
          <Text className="text-sm font-medium">{title}</Text>
          {!expanded && summary ? (
            <Text className="text-muted-foreground truncate text-xs">
              {summary}
            </Text>
          ) : null}
        </div>
      </button>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function EntityQueryFilterValueEditor({
  row,
  catalog,
  sourceEntity,
  disabled,
  onChange,
}: {
  readonly row: EntityQueryFilterEditorCondition;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly sourceEntity: EntityCatalogEntry | undefined;
  readonly disabled?: boolean;
  readonly onChange: (patch: Partial<EntityQueryFilterEditorCondition>) => void;
}) {
  const { t } = useTranslation("common");
  const fieldMeta = resolveQueryFilterFieldMeta(
    catalog,
    sourceEntity,
    row.field,
  );
  const fieldType = fieldMeta?.type ?? "string";
  const supportsTemporal = isDateLikeFieldType(fieldType);

  if (supportsTemporal) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          className={selectClassName}
          value={row.valueKind}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              valueKind: event.target.value as "static" | "temporal",
            })
          }
        >
          <option value="static">
            {t("queryBuilder.filters.valueKinds.static")}
          </option>
          <option value="temporal">
            {t("queryBuilder.filters.valueKinds.temporal")}
          </option>
        </Select>

        {row.valueKind === "temporal" ? (
          <Select
            className={selectClassName}
            value={row.temporalPreset}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                temporalPreset: event.target
                  .value as EntityQueryFilterEditorCondition["temporalPreset"],
              })
            }
          >
            {ENTITY_QUERY_TEMPORAL_PRESET_OPTIONS.map((preset) => (
              <option key={preset} value={preset}>
                {t(`queryBuilder.filters.temporalPresets.${preset}` as const)}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            value={row.scalarValue}
            disabled={disabled}
            type="datetime-local"
            onChange={(event) => onChange({ scalarValue: event.target.value })}
          />
        )}
      </div>
    );
  }

  if (
    row.valueKind === "static" &&
    (row.operator === "==" || row.operator === "in")
  ) {
    const operator = row.operator === "in" ? "in" : "==";
    const value =
      row.operator === "in"
        ? row.listValues.length > 0
          ? row.listValues
          : row.scalarValue
        : row.scalarValue;

    return (
      <EntityFieldConditionValueInput
        fieldMeta={fieldMeta ?? undefined}
        operator={operator}
        value={value}
        disabled={disabled}
        listPlaceholderKey="queryBuilder.filters.listPlaceholder"
        valuePlaceholderKey="queryBuilder.filters.valuePlaceholder"
        onChange={(nextValue) => {
          if (row.operator === "in") {
            const listValues = Array.isArray(nextValue)
              ? nextValue
              : [nextValue];
            onChange({
              listValues,
              scalarValue: listValues.join(", "),
            });
            return;
          }

          onChange({
            scalarValue: Array.isArray(nextValue)
              ? (nextValue[0] ?? "")
              : nextValue,
          });
        }}
      />
    );
  }

  if (fieldType === "enum" && fieldMeta?.enumValues) {
    return (
      <Select
        className={selectClassName}
        value={row.scalarValue}
        disabled={disabled}
        onChange={(event) => onChange({ scalarValue: event.target.value })}
      >
        <option value="">{t("queryBuilder.filters.selectValue")}</option>
        {fieldMeta.enumValues.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </Select>
    );
  }

  if (fieldType === "boolean") {
    return (
      <Select
        className={selectClassName}
        value={row.scalarValue}
        disabled={disabled}
        onChange={(event) => onChange({ scalarValue: event.target.value })}
      >
        <option value="">{t("queryBuilder.filters.selectValue")}</option>
        <option value="true">{t("entity.arrayBooleanTrue")}</option>
        <option value="false">{t("entity.arrayBooleanFalse")}</option>
      </Select>
    );
  }

  return (
    <Input
      value={row.scalarValue}
      disabled={disabled}
      type={fieldType === "number" ? "number" : "text"}
      placeholder={t("queryBuilder.filters.valuePlaceholder")}
      onChange={(event) => onChange({ scalarValue: event.target.value })}
    />
  );
}

function EntityQueryFilterConditionEditor({
  node,
  catalog,
  sourceEntity,
  disabled,
  onUpdateRoot,
}: {
  readonly node: EntityQueryFilterEditorCondition;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly sourceEntity: EntityCatalogEntry | undefined;
  readonly disabled?: boolean;
  readonly onUpdateRoot: (
    updater: (
      current: EntityQueryFilterEditorGroup,
    ) => EntityQueryFilterEditorGroup,
  ) => void;
}) {
  const { t } = useTranslation("common");

  const fieldMeta = resolveQueryFilterFieldMeta(
    catalog,
    sourceEntity,
    node.field,
  );
  const allowedOperators = getQueryFilterAllowedOperators(fieldMeta);

  const fieldOptions = useMemo(
    () => listEntityQueryFilterFieldOptions(sourceEntity, catalog),
    [catalog, sourceEntity],
  );

  const directFieldOptions = fieldOptions.filter(
    (option) => option.group === "direct",
  );
  const relationFieldOptions = fieldOptions.filter(
    (option) => option.group === "relation",
  );

  const fieldLabel =
    fieldOptions.find((option) => option.value === node.field)?.label ??
    node.field;
  const [expanded, setExpanded] = useState(true);
  const summary = formatConditionSummary(node, fieldLabel, t);

  return (
    <div className="border-border rounded-md border p-3">
      <FilterCollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        title={t("queryBuilder.filters.conditionLabel")}
        summary={summary}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onUpdateRoot((current) => removeEditorNode(current, node.id))
            }
          >
            {t("queryBuilder.filters.remove")}
          </Button>
        }
      />

      {expanded ? (
        <div className="mt-3 space-y-2">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {t("queryBuilder.filters.field")}
            </span>
            <Select
              className={selectClassName}
              value={node.field}
              disabled={disabled}
              onChange={(event) => {
                const nextField = event.target.value;
                const nextMeta = resolveQueryFilterFieldMeta(
                  catalog,
                  sourceEntity,
                  nextField,
                );
                const nextAllowed = getQueryFilterAllowedOperators(nextMeta);
                const nextOperator = nextAllowed.includes(node.operator)
                  ? node.operator
                  : (nextAllowed[0] ?? "==");

                onUpdateRoot((current) =>
                  updateEditorNode(current, node.id, {
                    field: nextField,
                    operator: nextOperator,
                  }),
                );
              }}
            >
              <option value="">{t("queryBuilder.selectField")}</option>
              {directFieldOptions.length > 0 ? (
                <optgroup label={t("queryBuilder.filters.directGroup")}>
                  {directFieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {relationFieldOptions.length > 0 ? (
                <optgroup label={t("queryBuilder.filters.relationGroup")}>
                  {relationFieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {t("queryBuilder.filters.operator")}
            </span>
            <Select
              className={selectClassName}
              value={node.operator}
              disabled={disabled}
              onChange={(event) =>
                onUpdateRoot((current) =>
                  updateEditorNode(current, node.id, {
                    operator: event.target
                      .value as EntityQueryFilterEditorCondition["operator"],
                  }),
                )
              }
            >
              {allowedOperators.map((operator) => (
                <option key={operator} value={operator}>
                  {t(`queryBuilder.filters.operators.${operator}`)}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              {t("queryBuilder.filters.value")}
            </span>
            <EntityQueryFilterValueEditor
              row={node}
              catalog={catalog}
              sourceEntity={sourceEntity}
              disabled={disabled}
              onChange={(patch) =>
                onUpdateRoot((current) =>
                  updateEditorNode(current, node.id, patch),
                )
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function EntityQueryFilterGroupEditor({
  group,
  catalog,
  sourceEntity,
  disabled,
  isRoot = false,
  depth = 0,
  onUpdateRoot,
}: {
  readonly group: EntityQueryFilterEditorGroup;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly sourceEntity: EntityCatalogEntry | undefined;
  readonly disabled?: boolean;
  readonly isRoot?: boolean;
  readonly depth?: number;
  readonly onUpdateRoot: (
    updater: (
      current: EntityQueryFilterEditorGroup,
    ) => EntityQueryFilterEditorGroup,
  ) => void;
}) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(true);

  const combinatorLabel = t(
    `queryBuilder.filters.combinator.${group.combinator}`,
  );
  const childCount = countFilterGroupChildren(group);
  const groupSummary =
    childCount === 0
      ? combinatorLabel
      : t("queryBuilder.filters.groupSummary", {
          combinator: combinatorLabel,
          count: childCount,
        });

  const combinatorSelect = (
    <Select
      className={`${selectClassName} w-auto min-w-[8rem]`}
      value={group.combinator}
      disabled={disabled}
      onChange={(event) =>
        onUpdateRoot((current) =>
          updateEditorNode(current, group.id, {
            combinator: event.target.value as "and" | "or",
          }),
        )
      }
    >
      <option value="and">{t("queryBuilder.filters.combinator.and")}</option>
      <option value="or">{t("queryBuilder.filters.combinator.or")}</option>
    </Select>
  );

  return (
    <div
      className={
        isRoot ? "space-y-3" : "border-border rounded-md border p-3 pl-4"
      }
      style={
        !isRoot && depth > 0 ? { marginLeft: `${depth * 0.5}rem` } : undefined
      }
    >
      <FilterCollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        title={
          isRoot
            ? t("queryBuilder.filters.label")
            : t("queryBuilder.filters.groupLabel")
        }
        summary={groupSummary}
        actions={
          <>
            {expanded ? combinatorSelect : null}
            {!isRoot ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  onUpdateRoot((current) => removeEditorNode(current, group.id))
                }
              >
                {t("queryBuilder.filters.removeGroup")}
              </Button>
            ) : null}
          </>
        }
      />

      {expanded ? (
        <div className="mt-3 space-y-3">
          {group.children.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t("queryBuilder.filters.empty")}
            </Text>
          ) : (
            <div className="space-y-3">
              {group.children.map((child) => {
                if (child.type === "group") {
                  return (
                    <EntityQueryFilterGroupEditor
                      key={child.id}
                      group={child}
                      catalog={catalog}
                      sourceEntity={sourceEntity}
                      disabled={disabled}
                      depth={depth + 1}
                      onUpdateRoot={onUpdateRoot}
                    />
                  );
                }

                return (
                  <EntityQueryFilterConditionEditor
                    key={child.id}
                    node={child}
                    catalog={catalog}
                    sourceEntity={sourceEntity}
                    disabled={disabled}
                    onUpdateRoot={onUpdateRoot}
                  />
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onUpdateRoot((current) =>
                  addChildToEditorGroup(
                    current,
                    group.id,
                    createEmptyEntityQueryFilterCondition(),
                  ),
                )
              }
            >
              {t("queryBuilder.filters.add")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onUpdateRoot((current) =>
                  addChildToEditorGroup(
                    current,
                    group.id,
                    createEmptyEntityQueryFilterGroup("and"),
                  ),
                )
              }
            >
              {t("queryBuilder.filters.addGroup")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface EntityQueryFiltersEditorProps {
  readonly entity: EntityCatalogEntry | undefined;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly filterRoot: EntityQueryFilterEditorGroup;
  readonly disabled?: boolean;
  readonly onChange: (filterRoot: EntityQueryFilterEditorGroup) => void;
}

export function EntityQueryFiltersEditor({
  entity,
  catalog,
  filterRoot,
  disabled = false,
  onChange,
}: EntityQueryFiltersEditorProps) {
  return (
    <EntityQueryFilterGroupEditor
      group={filterRoot}
      catalog={catalog}
      sourceEntity={entity}
      disabled={disabled}
      isRoot
      onUpdateRoot={(updater) => onChange(updater(filterRoot))}
    />
  );
}
