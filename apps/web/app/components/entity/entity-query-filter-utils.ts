import {
  getAllowedOperatorsForFieldType,
  listQueryableFieldPaths,
  resolveQueryableFieldMeta,
  type EntityQueryDefinitionFilterRoot,
  type EntityQueryFilterCondition,
  type EntityQueryFilterNode,
  type EntityQueryFilterOperator,
  type EntityQueryFilterValue,
  type EntityQueryParameter,
  type EntityCatalogEntry as QueryCatalogEntry,
  type QueryableFieldMeta,
} from "@repo/entity-queries/browser";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import type { EntityQueryDefinitionRecord } from "../../lib/api-client";

export type EntityQueryTemporalPreset =
  | "today"
  | "startOfDay"
  | "endOfDay"
  | "startOfMonth"
  | "endOfMonth"
  | "startOfYear"
  | "endOfYear";

export interface EntityQueryFilterEditorCondition {
  readonly id: string;
  readonly type: "condition";
  readonly field: string;
  readonly operator: EntityQueryFilterOperator;
  readonly valueKind: "static" | "temporal";
  readonly temporalPreset: EntityQueryTemporalPreset;
  readonly scalarValue: string;
  readonly listValues: readonly string[];
}

export interface EntityQueryFilterEditorGroup {
  readonly id: string;
  readonly type: "group";
  readonly combinator: "and" | "or";
  readonly children: readonly EntityQueryFilterEditorNode[];
}

export type EntityQueryFilterEditorNode =
  | EntityQueryFilterEditorCondition
  | EntityQueryFilterEditorGroup;

export interface EntityQuerySortEditorRow {
  readonly id: string;
  readonly field: string;
  readonly direction: "asc" | "desc";
}

const TEMPORAL_PRESETS: readonly EntityQueryTemporalPreset[] = [
  "today",
  "startOfDay",
  "endOfDay",
  "startOfMonth",
  "endOfMonth",
  "startOfYear",
  "endOfYear",
];

const ENTITY_QUERY_FILTER_OPERATORS: readonly EntityQueryFilterOperator[] = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "in",
];

export function createEmptyEntityQueryFilterCondition(): EntityQueryFilterEditorCondition {
  return {
    id: crypto.randomUUID(),
    type: "condition",
    field: "",
    operator: "==",
    valueKind: "static",
    temporalPreset: "today",
    scalarValue: "",
    listValues: [],
  };
}

export function createEmptyEntityQueryFilterGroup(
  combinator: "and" | "or" = "and",
): EntityQueryFilterEditorGroup {
  return {
    id: crypto.randomUUID(),
    type: "group",
    combinator,
    children: [],
  };
}

export function createEmptyEntityQueryFilterRoot(): EntityQueryFilterEditorGroup {
  return createEmptyEntityQueryFilterGroup("and");
}

export function createEmptyEntityQuerySortRow(): EntityQuerySortEditorRow {
  return {
    id: crypto.randomUUID(),
    field: "",
    direction: "asc",
  };
}

function resolveParameterToTemporalPreset(
  value: Extract<EntityQueryFilterValue, { type: "parameter" }>,
  parameters: readonly EntityQueryParameter[] | undefined,
): EntityQueryTemporalPreset | null {
  if (!parameters?.length || value.offset !== undefined) {
    return null;
  }

  const parameter = parameters.find((entry) => entry.name === value.name);
  if (!parameter || parameter.valueType !== "dateBucket") {
    return null;
  }

  const granularity = parameter.granularity ?? "month";
  if (granularity === "month") {
    if (value.bound === "start") {
      return "startOfMonth";
    }
    if (value.bound === "end") {
      return "endOfMonth";
    }
  }

  if (granularity === "year") {
    if (value.bound === "start") {
      return "startOfYear";
    }
    if (value.bound === "end") {
      return "endOfYear";
    }
  }

  return null;
}

function conditionToEditorRow(
  filter: EntityQueryFilterCondition,
  parameters?: readonly EntityQueryParameter[],
): EntityQueryFilterEditorCondition {
  if (filter.value.type === "temporal") {
    return {
      id: crypto.randomUUID(),
      type: "condition",
      field: filter.field,
      operator: filter.operator,
      valueKind: "temporal",
      temporalPreset: filter.value.preset,
      scalarValue: "",
      listValues: [],
    };
  }

  if (filter.value.type === "parameter") {
    const temporalPreset = resolveParameterToTemporalPreset(
      filter.value,
      parameters,
    );
    if (temporalPreset) {
      return {
        id: crypto.randomUUID(),
        type: "condition",
        field: filter.field,
        operator: filter.operator,
        valueKind: "temporal",
        temporalPreset,
        scalarValue: "",
        listValues: [],
      };
    }

    return {
      id: crypto.randomUUID(),
      type: "condition",
      field: filter.field,
      operator: filter.operator,
      valueKind: "static",
      temporalPreset: "today",
      scalarValue: `$${filter.value.name}${filter.value.bound ? `:${filter.value.bound}` : ""}`,
      listValues: [],
    };
  }

  const raw = filter.value.value;
  if (Array.isArray(raw)) {
    return {
      id: crypto.randomUUID(),
      type: "condition",
      field: filter.field,
      operator: filter.operator,
      valueKind: "static",
      temporalPreset: "today",
      scalarValue: raw.map(String).join(", "),
      listValues: raw.map(String),
    };
  }

  return {
    id: crypto.randomUUID(),
    type: "condition",
    field: filter.field,
    operator: filter.operator,
    valueKind: "static",
    temporalPreset: "today",
    scalarValue: String(raw),
    listValues: [],
  };
}

function entityQueryFilterToEditorNode(
  node: EntityQueryFilterNode,
  parameters?: readonly EntityQueryParameter[],
): EntityQueryFilterEditorNode {
  if (node.type === "condition") {
    return conditionToEditorRow(node, parameters);
  }

  return {
    id: crypto.randomUUID(),
    type: "group",
    combinator: node.combinator,
    children: node.children.map((child) =>
      entityQueryFilterToEditorNode(child, parameters),
    ),
  };
}

export function entityQueryFilterRootToEditor(
  filter: EntityQueryDefinitionRecord["filter"],
  parameters?: readonly EntityQueryParameter[],
): EntityQueryFilterEditorGroup {
  return entityQueryFilterToEditorNode(
    filter,
    parameters,
  ) as EntityQueryFilterEditorGroup;
}

function editorConditionToApi(
  row: EntityQueryFilterEditorCondition,
): EntityQueryFilterCondition | null {
  if (row.field.trim().length === 0) {
    return null;
  }

  if (row.valueKind === "temporal") {
    return {
      type: "condition",
      field: row.field,
      operator: row.operator,
      value: {
        type: "temporal",
        preset: row.temporalPreset,
      },
    };
  }

  if (row.operator === "in") {
    const values =
      row.listValues.length > 0
        ? row.listValues
        : row.scalarValue
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);

    return {
      type: "condition",
      field: row.field,
      operator: row.operator,
      value: {
        type: "static",
        value: values as (string | number | boolean)[],
      },
    };
  }

  let parsedValue: string | number | boolean = row.scalarValue;
  if (row.scalarValue === "true" || row.scalarValue === "false") {
    parsedValue = row.scalarValue === "true";
  } else if (
    row.scalarValue.trim().length > 0 &&
    !Number.isNaN(Number(row.scalarValue)) &&
    row.scalarValue.trim() === String(Number(row.scalarValue))
  ) {
    parsedValue = Number(row.scalarValue);
  }

  return {
    type: "condition",
    field: row.field,
    operator: row.operator,
    value: {
      type: "static",
      value: parsedValue,
    },
  };
}

function editorNodeToEntityQueryFilter(
  node: EntityQueryFilterEditorNode,
): EntityQueryFilterNode | null {
  if (node.type === "condition") {
    return editorConditionToApi(node);
  }

  const children = node.children
    .map((child) => editorNodeToEntityQueryFilter(child))
    .filter((child): child is EntityQueryFilterNode => child !== null);

  if (children.length === 0) {
    return null;
  }

  return {
    type: "group",
    combinator: node.combinator,
    children,
  };
}

export function editorRootToEntityQueryFilter(
  root: EntityQueryFilterEditorGroup,
): EntityQueryDefinitionFilterRoot {
  const children = root.children
    .map((child) => editorNodeToEntityQueryFilter(child))
    .filter((child): child is EntityQueryFilterNode => child !== null);

  return {
    type: "group",
    combinator: root.combinator,
    children,
  };
}

export function normalizeEditorFilterForComparison(
  root: EntityQueryFilterEditorGroup,
): EntityQueryDefinitionRecord["filter"] {
  return editorRootToEntityQueryFilter(root);
}

export function entityQuerySortToEditorRows(
  sort: EntityQueryDefinitionRecord["sort"],
): EntityQuerySortEditorRow[] {
  return sort.map((entry) => ({
    id: crypto.randomUUID(),
    field: entry.field,
    direction: entry.direction,
  }));
}

export function editorRowsToEntityQuerySort(
  rows: readonly EntityQuerySortEditorRow[],
): EntityQueryDefinitionRecord["sort"] {
  return rows
    .filter((row) => row.field.trim().length > 0)
    .map((row) => ({
      field: row.field,
      direction: row.direction,
    }));
}

interface EntityQueryFilterFieldOption {
  readonly value: string;
  readonly label: string;
  readonly group: "direct" | "relation";
}

export function listEntityQueryFilterFieldOptions(
  entity: EntityCatalogEntry | undefined,
  catalog: readonly EntityCatalogEntry[],
): readonly EntityQueryFilterFieldOption[] {
  if (!entity) {
    return [];
  }

  return listQueryableFieldPaths(
    entity as QueryCatalogEntry,
    catalog as readonly QueryCatalogEntry[],
  );
}

export function resolveQueryFilterFieldMeta(
  catalog: readonly EntityCatalogEntry[],
  sourceEntity: EntityCatalogEntry | undefined,
  fieldPath: string,
): QueryableFieldMeta | null {
  if (!sourceEntity) {
    return null;
  }

  return resolveQueryableFieldMeta(
    sourceEntity as QueryCatalogEntry,
    catalog as readonly QueryCatalogEntry[],
    fieldPath,
  );
}

export function getQueryFilterAllowedOperators(
  fieldMeta: QueryableFieldMeta | null,
): readonly EntityQueryFilterOperator[] {
  if (!fieldMeta) {
    return ENTITY_QUERY_FILTER_OPERATORS;
  }

  return getAllowedOperatorsForFieldType(fieldMeta.type);
}

export function isDateLikeFieldType(fieldType: string | undefined): boolean {
  return fieldType === "date";
}

export function updateEditorNode(
  root: EntityQueryFilterEditorGroup,
  id: string,
  patch: Partial<EntityQueryFilterEditorNode>,
): EntityQueryFilterEditorGroup {
  if (root.id === id) {
    return { ...root, ...patch } as EntityQueryFilterEditorGroup;
  }

  return {
    ...root,
    children: updateEditorNodeList(root.children, id, patch),
  };
}

function updateEditorNodeList(
  nodes: readonly EntityQueryFilterEditorNode[],
  id: string,
  patch: Partial<EntityQueryFilterEditorNode>,
): EntityQueryFilterEditorNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, ...patch } as EntityQueryFilterEditorNode;
    }
    if (node.type === "group") {
      return {
        ...node,
        children: updateEditorNodeList(node.children, id, patch),
      };
    }
    return node;
  });
}

export function removeEditorNode(
  root: EntityQueryFilterEditorGroup,
  id: string,
): EntityQueryFilterEditorGroup {
  return {
    ...root,
    children: removeEditorNodeFromList(root.children, id),
  };
}

function removeEditorNodeFromList(
  nodes: readonly EntityQueryFilterEditorNode[],
  id: string,
): EntityQueryFilterEditorNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.type === "group") {
        return {
          ...node,
          children: removeEditorNodeFromList(node.children, id),
        };
      }
      return node;
    });
}

export function addChildToEditorGroup(
  root: EntityQueryFilterEditorGroup,
  groupId: string,
  child: EntityQueryFilterEditorNode,
): EntityQueryFilterEditorGroup {
  if (root.id === groupId) {
    return { ...root, children: [...root.children, child] };
  }

  return {
    ...root,
    children: root.children.map((node) => {
      if (node.type === "group") {
        return addChildToNestedGroup(node, groupId, child);
      }
      return node;
    }),
  };
}

function addChildToNestedGroup(
  group: EntityQueryFilterEditorGroup,
  groupId: string,
  child: EntityQueryFilterEditorNode,
): EntityQueryFilterEditorGroup {
  if (group.id === groupId) {
    return { ...group, children: [...group.children, child] };
  }

  return {
    ...group,
    children: group.children.map((node) => {
      if (node.type === "group") {
        return addChildToNestedGroup(node, groupId, child);
      }
      return node;
    }),
  };
}

export { TEMPORAL_PRESETS as ENTITY_QUERY_TEMPORAL_PRESET_OPTIONS };
