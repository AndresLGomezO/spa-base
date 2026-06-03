import type { UiLayoutDocument } from "../types/layout.js";
import { isMetricKpiComponent } from "../types/component.js";
import type { UiComponentConfig } from "../types/component.js";
import { listDataSourcePaths } from "../resolver/data-source.js";
import type { ColumnNode, RowNode } from "../types/layout.js";

const ALLOWED_SYSTEM_FIELDS = new Set(["id", "createdAt", "updatedAt"]);

export interface FieldPathValidationDefinition {
  readonly name: string;
  readonly fields: Readonly<
    Record<
      string,
      {
        readonly relation?: {
          readonly type: string;
          readonly target?: string;
        };
      }
    >
  >;
}

export function isValidLayoutFieldPath(
  definition: FieldPathValidationDefinition,
  fieldPath: string,
): boolean {
  const trimmed = fieldPath.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (!trimmed.includes(".")) {
    if (ALLOWED_SYSTEM_FIELDS.has(trimmed)) {
      return true;
    }
    return trimmed in definition.fields;
  }

  const [firstSegment, subField] = trimmed.split(".", 2);
  if (!firstSegment || !subField) {
    return false;
  }

  const relationField = resolveRelationFieldName(definition, firstSegment);
  if (!relationField) {
    return false;
  }

  const relationMeta = definition.fields[relationField];
  if (!relationMeta?.relation) {
    return false;
  }

  const relationType = relationMeta.relation.type;
  return relationType === "many-to-one" || relationType === "one-to-one";
}

function resolveRelationFieldName(
  definition: FieldPathValidationDefinition,
  pathSegment: string,
): string | null {
  const segment = pathSegment.trim();
  const directMeta = definition.fields[segment];
  if (
    directMeta?.relation &&
    (directMeta.relation.type === "many-to-one" ||
      directMeta.relation.type === "one-to-one")
  ) {
    return segment;
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one") &&
      meta.relation.target === segment
    ) {
      return fieldName;
    }
  }

  return null;
}

function collectComponentPaths(
  component: UiComponentConfig,
): readonly string[] {
  if (isMetricKpiComponent(component)) {
    return [];
  }

  if (component.kind === "form-field") {
    return [component.fieldPath];
  }

  if (
    component.kind === "form-section" ||
    component.kind === "form-actions" ||
    component.kind === "related-records" ||
    component.kind === "page-header" ||
    component.kind === "page-toolbar" ||
    component.kind === "page-metrics" ||
    component.kind === "page-list"
  ) {
    return [];
  }

  return listDataSourcePaths(component.primary, component.fallbacks);
}

function walkRows(rows: readonly RowNode[], paths: Set<string>): void {
  for (const row of rows) {
    if (row.type === "component") {
      for (const path of collectComponentPaths(row.component)) {
        paths.add(path);
      }
      continue;
    }

    for (const column of row.columns) {
      walkColumn(column, paths);
    }
  }
}

function walkColumn(column: ColumnNode, paths: Set<string>): void {
  walkRows(column.rows, paths);
}

export function collectLayoutFieldPaths(
  layout: UiLayoutDocument,
): readonly string[] {
  const paths = new Set<string>();
  for (const column of layout.root.columns) {
    walkColumn(column, paths);
  }
  return [...paths];
}

export function assertLayoutFieldPaths(
  definition: FieldPathValidationDefinition,
  layout: UiLayoutDocument,
  context: string,
): void {
  for (const fieldPath of collectLayoutFieldPaths(layout)) {
    if (!isValidLayoutFieldPath(definition, fieldPath)) {
      throw new Error(
        `Invalid ${context} layout field path "${fieldPath}" for entity "${definition.name}".`,
      );
    }
  }
}

export interface ListLayoutFieldOptionsParams {
  readonly resolveTarget?: (
    target: string,
  ) => FieldPathValidationDefinition | undefined;
}

export function listLayoutFieldOptions(
  definition: FieldPathValidationDefinition,
  params?: ListLayoutFieldOptionsParams,
): readonly string[] {
  const relationFkFields = new Set<string>();
  const options = new Set<string>(["createdAt", "updatedAt"]);

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one")
    ) {
      relationFkFields.add(fieldName);
      const target = meta.relation.target;
      if (target) {
        const targetDefinition = params?.resolveTarget?.(target);
        const relationSubfields = ["name", "code", "logo"] as const;

        for (const subfield of relationSubfields) {
          if (!targetDefinition) {
            if (subfield !== "logo") {
              options.add(`${target}.${subfield}`);
            }
            continue;
          }

          if (subfield in targetDefinition.fields) {
            options.add(`${target}.${subfield}`);
          }
        }
      }
      continue;
    }

    options.add(fieldName);
  }

  for (const fkField of relationFkFields) {
    options.delete(fkField);
  }

  return [...options].sort((a, b) => a.localeCompare(b));
}

export function relationAliasFieldPath(
  definition: FieldPathValidationDefinition,
  fieldPath: string,
): string {
  const trimmed = fieldPath.trim();
  if (!trimmed.includes(".")) {
    return trimmed;
  }

  const [firstSegment, subField] = trimmed.split(".", 2);
  if (!firstSegment || !subField) {
    return trimmed;
  }

  const relationField = resolveRelationFieldName(definition, firstSegment);
  if (!relationField) {
    return trimmed;
  }

  const relationMeta = definition.fields[relationField];
  const alias = relationMeta?.relation?.target;
  if (!alias) {
    return trimmed;
  }

  return `${alias}.${subField}`;
}

export function formatFieldPathLabel(fieldPath: string): string {
  const segment = fieldPath.includes(".")
    ? (fieldPath.split(".").pop() ?? fieldPath)
    : fieldPath;
  return segment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
