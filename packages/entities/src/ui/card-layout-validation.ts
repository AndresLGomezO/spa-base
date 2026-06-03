import type { SerializableEntityDefinition } from "./types.js";
import { isCardMetricKpiBinding } from "./metric-widget-types.js";
import type { CardLayoutConfig, LayoutNode } from "./card-layout-types.js";

const CARD_LAYOUT_ALLOWED_SYSTEM_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
]);

export function isValidCardLayoutFieldPath(
  definition: SerializableEntityDefinition,
  fieldPath: string,
): boolean {
  const trimmed = fieldPath.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (!trimmed.includes(".")) {
    if (CARD_LAYOUT_ALLOWED_SYSTEM_FIELDS.has(trimmed)) {
      return true;
    }
    return trimmed in definition.fields;
  }

  const [firstSegment, subField] = trimmed.split(".", 2);
  if (!firstSegment || !subField) {
    return false;
  }

  const relationField = resolveRelationFieldNameForValidation(
    definition,
    firstSegment,
  );
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

function resolveRelationFieldNameForValidation(
  definition: SerializableEntityDefinition,
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

function collectLayoutFieldPaths(layout: CardLayoutConfig): readonly string[] {
  const paths = new Set<string>();

  function walkNode(node: LayoutNode): void {
    if (node.type === "slot") {
      const binding = layout.slots[node.slotId];
      if (binding && !isCardMetricKpiBinding(binding)) {
        if ("staticText" in binding && binding.staticText !== undefined) {
          return;
        }
        if (binding.fieldPath) {
          paths.add(binding.fieldPath);
        }
        for (const fallbackPath of binding.fallbackFieldPaths ?? []) {
          const trimmed = fallbackPath.trim();
          if (trimmed.length > 0) {
            paths.add(trimmed);
          }
        }
      }
      return;
    }
    for (const child of node.children) {
      walkNode(child);
    }
  }

  walkNode(layout.root);
  for (const binding of Object.values(layout.slots)) {
    if (!isCardMetricKpiBinding(binding)) {
      if ("staticText" in binding && binding.staticText !== undefined) {
        continue;
      }
      if (binding.fieldPath) {
        paths.add(binding.fieldPath);
      }
      for (const fallbackPath of binding.fallbackFieldPaths ?? []) {
        const trimmed = fallbackPath.trim();
        if (trimmed.length > 0) {
          paths.add(trimmed);
        }
      }
    }
  }

  return [...paths];
}

export function assertCardLayoutFieldPaths(
  definition: SerializableEntityDefinition,
  layout: CardLayoutConfig,
  context: string,
): void {
  for (const fieldPath of collectLayoutFieldPaths(layout)) {
    if (!isValidCardLayoutFieldPath(definition, fieldPath)) {
      throw new Error(
        `Invalid ${context} layout field path "${fieldPath}" for entity "${definition.name}".`,
      );
    }
  }
}

export function relationAliasFieldPath(
  definition: SerializableEntityDefinition,
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

  const relationField = resolveRelationFieldNameForValidation(
    definition,
    firstSegment,
  );
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

export function listCardLayoutFieldOptions(
  definition: SerializableEntityDefinition,
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
      options.add(`${target}.logo`);
      options.add(`${target}.name`);
      options.add(`${target}.code`);
      continue;
    }

    options.add(fieldName);
  }

  for (const fkField of relationFkFields) {
    options.delete(fkField);
  }

  return [...options].sort((a, b) => a.localeCompare(b));
}

export type { CardLayoutConfig, LayoutNode };
export type { CardSlotBinding } from "./card-layout-types.js";
