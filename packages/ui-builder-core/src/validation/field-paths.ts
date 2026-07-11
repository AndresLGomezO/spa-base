import type { UiLayoutDocument } from "../types/layout.js";
import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import {
  isQueryViewerComponent,
  isRowHolderComponent,
  isDashboardSectionComponent,
  isMetricKpiComponent,
  isMetricDerivedKpiComponent,
  isMetricWidgetComponent,
  isUserComponent,
  isNotificationBellComponent,
  isSidebarNavComponent,
  isSidebarCollapseComponent,
  isSidebarTriggerComponent,
  isNavTabComponent,
  isChartComponent,
} from "../types/component.js";
import type { UiComponentConfig } from "../types/component.js";
import { listDataSourcePaths } from "../resolver/data-source.js";
import type { RowNode } from "../types/layout.js";
import { collectNestedRelationLayoutFieldPaths } from "./layout-field-leaf.js";

const ALLOWED_SYSTEM_FIELDS = new Set(["id", "createdAt", "updatedAt"]);

export interface FieldPathValidationDefinition {
  readonly name: string;
  readonly fields: Readonly<
    Record<
      string,
      {
        readonly type?: string;
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
  params?: ListLayoutFieldOptionsParams,
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

  const segments = trimmed.split(".");
  if (segments.length >= 3) {
    const firstSegment = segments[0];
    if (!firstSegment) {
      return false;
    }

    const relationField = resolveRelationFieldName(definition, firstSegment);
    if (!relationField) {
      return false;
    }

    const relationMeta = definition.fields[relationField];
    const targetEntity = relationMeta?.relation?.target;
    if (!targetEntity) {
      return false;
    }

    const targetDefinition = params?.resolveTarget?.(targetEntity);
    if (!targetDefinition) {
      return true;
    }

    return isValidLayoutFieldPath(
      targetDefinition,
      segments.slice(1).join("."),
      params,
    );
  }

  const [firstSegment, subField] = trimmed.split(".", 2);
  if (!firstSegment || !subField) {
    return false;
  }

  const relationField = resolveRelationFieldName(definition, firstSegment);
  if (relationField) {
    const relationMeta = definition.fields[relationField];
    if (!relationMeta?.relation) {
      return false;
    }

    const relationType = relationMeta.relation.type;
    return relationType === "many-to-one" || relationType === "one-to-one";
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (meta.relation?.type !== "one-to-many") {
      continue;
    }

    const target = meta.relation.target;
    if (!target) {
      continue;
    }

    if (fieldName !== firstSegment && target !== firstSegment) {
      continue;
    }

    const childDefinition = params?.resolveTarget?.(target);
    if (!childDefinition) {
      return true;
    }

    return (
      subField in childDefinition.fields || ALLOWED_SYSTEM_FIELDS.has(subField)
    );
  }

  const reverseChild = params?.resolveTarget?.(firstSegment);
  if (reverseChild) {
    for (const meta of Object.values(reverseChild.fields)) {
      if (
        meta.relation?.target === definition.name &&
        (meta.relation.type === "many-to-one" ||
          meta.relation.type === "one-to-one")
      ) {
        return subField in reverseChild.fields;
      }
    }
  }

  return false;
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
  if (
    isMetricKpiComponent(component) ||
    isMetricDerivedKpiComponent(component) ||
    isMetricWidgetComponent(component) ||
    isDashboardSectionComponent(component) ||
    isUserComponent(component) ||
    isNotificationBellComponent(component) ||
    isSidebarNavComponent(component) ||
    isSidebarCollapseComponent(component) ||
    isSidebarTriggerComponent(component) ||
    isNavTabComponent(component) ||
    isChartComponent(component)
  ) {
    return [];
  }

  if (component.kind === "form-field") {
    return [component.fieldPath];
  }

  if (component.kind === "entity-field-selector") {
    return [component.fieldPath];
  }

  if (
    isRowHolderComponent(component) ||
    component.kind === "form-section" ||
    component.kind === "icon" ||
    component.kind === "form-actions" ||
    component.kind === "wizard-progress" ||
    component.kind === "wizard-step-host" ||
    component.kind === "wizard-actions" ||
    component.kind === "related-records" ||
    component.kind === "page-header" ||
    component.kind === "page-toolbar" ||
    component.kind === "page-metrics" ||
    component.kind === "page-list" ||
    component.kind === "view-search" ||
    component.kind === "view-filters" ||
    component.kind === "view-date-filter"
  ) {
    return [];
  }

  return listDataSourcePaths(component.primary, component.fallbacks);
}

function collectInputComponentPaths(
  component: UiComponentConfig,
): readonly string[] {
  if (component.kind === "form-field") {
    return [component.fieldPath];
  }

  if (component.kind === "entity-field-selector") {
    return [component.fieldPath];
  }

  return [];
}

function collectLayoutPathsFromLayout(
  layout: UiLayoutDocument,
  collectPaths: (component: UiComponentConfig) => readonly string[],
): readonly string[] {
  const paths = new Set<string>();
  for (const column of resolveLayoutRootColumns(layout)) {
    walkRowsWithCollector(column.rows, paths, collectPaths);
  }
  return [...paths];
}

function walkRowsWithCollector(
  rows: readonly RowNode[],
  paths: Set<string>,
  collectPaths: (component: UiComponentConfig) => readonly string[],
): void {
  for (const row of rows) {
    if (isQueryViewerComponent(row.component)) {
      continue;
    }

    if (isRowHolderComponent(row.component)) {
      walkRowsWithCollector(row.component.rows, paths, collectPaths);
      continue;
    }

    for (const path of collectPaths(row.component)) {
      paths.add(path);
    }
  }
}

export function collectLayoutFieldPaths(
  layout: UiLayoutDocument,
): readonly string[] {
  return collectLayoutPathsFromLayout(layout, collectComponentPaths);
}

/** Field paths from editable form slots only (`form-field`, `entity-field-selector`). */
export function collectLayoutInputFieldPaths(
  layout: UiLayoutDocument,
): readonly string[] {
  return collectLayoutPathsFromLayout(layout, collectInputComponentPaths);
}

export function layoutHasInputFields(layout: UiLayoutDocument): boolean {
  return collectLayoutInputFieldPaths(layout).length > 0;
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
  readonly catalog?: readonly FieldPathValidationDefinition[];
}

function hasExplicitOneToManyToChild(
  definition: FieldPathValidationDefinition,
  childEntityName: string,
): boolean {
  return Object.values(definition.fields).some(
    (meta) =>
      meta.relation?.type === "one-to-many" &&
      meta.relation.target === childEntityName,
  );
}

function addReverseOneToManyLayoutFieldPaths(
  definition: FieldPathValidationDefinition,
  options: Set<string>,
  catalog: readonly FieldPathValidationDefinition[],
): void {
  for (const childDefinition of catalog) {
    if (childDefinition.name === definition.name) {
      continue;
    }

    if (hasExplicitOneToManyToChild(definition, childDefinition.name)) {
      continue;
    }

    for (const [foreignKeyField, meta] of Object.entries(
      childDefinition.fields,
    )) {
      if (
        meta.relation?.target !== definition.name ||
        (meta.relation.type !== "many-to-one" &&
          meta.relation.type !== "one-to-one")
      ) {
        continue;
      }

      for (const [subFieldName, subMeta] of Object.entries(
        childDefinition.fields,
      )) {
        if (subFieldName === foreignKeyField || subMeta.type === "document") {
          continue;
        }

        options.add(`${childDefinition.name}.${subFieldName}`);
      }
    }
  }
}

/** Field paths assignable to `form-field` slots (direct entity fields, including relations). */
export function listFormFieldOptions(
  definition: FieldPathValidationDefinition,
): readonly string[] {
  const options: string[] = [];

  for (const [fieldName] of Object.entries(definition.fields)) {
    options.push(fieldName);
  }

  return options.sort((a, b) => a.localeCompare(b));
}

/** Top-level entity fields assignable to table / expandableTable view columns. */
export function listTableColumnFieldOptions(
  definition: FieldPathValidationDefinition,
): readonly string[] {
  const options: string[] = [];

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (meta.type === "document") {
      continue;
    }
    options.push(fieldName);
  }

  return options.sort((a, b) => a.localeCompare(b));
}

export function isValidTableColumnFieldPath(
  definition: FieldPathValidationDefinition,
  fieldPath: string,
): boolean {
  const trimmed = fieldPath.trim();
  if (trimmed.length === 0 || trimmed.includes(".")) {
    return false;
  }

  if (trimmed === "id" || trimmed === "createdAt") {
    return true;
  }

  if (ALLOWED_SYSTEM_FIELDS.has(trimmed)) {
    return false;
  }

  const meta = definition.fields[trimmed];
  if (!meta) {
    return false;
  }

  return meta.type !== "document";
}

export function normalizeTableColumnFieldPath(
  definition: FieldPathValidationDefinition,
  fieldPath: string,
): string {
  const trimmed = fieldPath.trim();
  if (!trimmed.includes(".")) {
    return trimmed;
  }

  const [firstSegment] = trimmed.split(".", 2);
  if (!firstSegment) {
    return trimmed;
  }

  const relationField = resolveRelationFieldName(definition, firstSegment);
  return relationField ?? trimmed;
}

export function sanitizeTableColumnFieldPaths(
  definition: FieldPathValidationDefinition,
  fields: readonly string[],
): readonly string[] {
  const normalized = fields.map((field) =>
    normalizeTableColumnFieldPath(definition, field),
  );
  const filtered = normalized.filter((field) =>
    isValidTableColumnFieldPath(definition, field),
  );
  if (filtered.length > 0) {
    return [...new Set(filtered)];
  }

  const fallback = listTableColumnFieldOptions(definition);
  return fallback.length > 0 ? fallback.slice(0, 4) : ["name"];
}

export function isValidFormFieldPath(
  definition: FieldPathValidationDefinition,
  fieldPath: string,
): boolean {
  const trimmed = fieldPath.trim();
  if (trimmed.length === 0 || trimmed.includes(".")) {
    return false;
  }

  if (ALLOWED_SYSTEM_FIELDS.has(trimmed)) {
    return true;
  }

  const meta = definition.fields[trimmed];
  if (!meta) {
    return false;
  }

  return true;
}

export function isValidEntityFieldSelectorFieldPath(
  definition: FieldPathValidationDefinition,
  fieldPath: string,
): boolean {
  const trimmed = fieldPath.trim();
  if (trimmed.length === 0 || trimmed.includes(".")) {
    return false;
  }

  const meta = definition.fields[trimmed];
  if (!meta) {
    return false;
  }

  if (meta.type === "enum") {
    return true;
  }

  if (meta.type === "relation" && meta.relation) {
    const relationType = meta.relation.type;
    return (
      relationType === "many-to-one" ||
      relationType === "one-to-one" ||
      relationType === "many-to-many"
    );
  }

  return false;
}

/** Field paths assignable to `entity-field-selector` slots (relation + enum). */
export function listEntityFieldSelectorFieldOptions(
  definition: FieldPathValidationDefinition,
): readonly string[] {
  const options: string[] = [];

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    void meta;
    if (isValidEntityFieldSelectorFieldPath(definition, fieldName)) {
      options.push(fieldName);
    }
  }

  return options.sort((a, b) => a.localeCompare(b));
}

function validateFormComponent(
  component: UiComponentConfig,
  definition: FieldPathValidationDefinition,
  context: string,
): void {
  if (component.kind === "form-field") {
    if (!isValidFormFieldPath(definition, component.fieldPath)) {
      throw new Error(
        `Invalid ${context} form field path "${component.fieldPath}" for entity "${definition.name}".`,
      );
    }
    return;
  }

  if (component.kind === "entity-field-selector") {
    if (!isValidEntityFieldSelectorFieldPath(definition, component.fieldPath)) {
      throw new Error(
        `Invalid ${context} entity field selector path "${component.fieldPath}" for entity "${definition.name}".`,
      );
    }
  }
}

function walkFormComponentValidation(
  rows: readonly RowNode[],
  definition: FieldPathValidationDefinition,
  context: string,
): void {
  for (const row of rows) {
    validateFormComponent(row.component, definition, context);
    if (isRowHolderComponent(row.component)) {
      walkFormComponentValidation(row.component.rows, definition, context);
    }
  }
}

export function assertFormLayoutFieldPaths(
  definition: FieldPathValidationDefinition,
  layout: UiLayoutDocument,
  context: string,
): void {
  for (const column of resolveLayoutRootColumns(layout)) {
    walkFormComponentValidation(column.rows, definition, context);
  }
}

export function listLayoutFieldOptions(
  definition: FieldPathValidationDefinition,
  params?: ListLayoutFieldOptionsParams,
): readonly string[] {
  const relationFkFields = new Set<string>();
  const options = new Set<string>(["id", "createdAt", "updatedAt"]);

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
        if (!targetDefinition) {
          for (const subfield of ["id", "name", "code"] as const) {
            options.add(`${target}.${subfield}`);
          }
          continue;
        }

        collectNestedRelationLayoutFieldPaths(
          targetDefinition,
          { resolveTarget: params?.resolveTarget },
          options,
          target,
          1,
        );
      }
      continue;
    }

    if (meta.relation?.type === "one-to-many") {
      relationFkFields.add(fieldName);
      const target = meta.relation.target;
      if (target) {
        const childDefinition = params?.resolveTarget?.(target);
        if (childDefinition) {
          for (const [subFieldName, subMeta] of Object.entries(
            childDefinition.fields,
          )) {
            if (subMeta.type === "document") {
              continue;
            }

            options.add(`${target}.${subFieldName}`);
          }
        }
      }
      continue;
    }

    options.add(fieldName);
  }

  if (params?.catalog) {
    addReverseOneToManyLayoutFieldPaths(definition, options, params.catalog);
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
