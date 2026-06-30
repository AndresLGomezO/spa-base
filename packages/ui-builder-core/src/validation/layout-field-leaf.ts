import type { FieldPathValidationDefinition } from "./field-paths.js";

export const MAX_LAYOUT_RELATION_HOPS = 3;

export interface ResolvedLayoutFieldLeaf {
  readonly rootRelationField: string | null;
  readonly leafDefinition: FieldPathValidationDefinition;
  readonly leafFieldName: string;
  readonly pathPrefix: string;
  readonly leafEntityName: string;
}

export type LayoutFieldLeafLookup = (
  target: string,
) => FieldPathValidationDefinition | undefined;

function resolveRelationFieldName(
  definition: FieldPathValidationDefinition,
  pathSegment: string,
): string | null {
  const segment = pathSegment.trim();
  if (!segment) {
    return null;
  }

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

function resolveOneToManyRelationFieldName(
  definition: FieldPathValidationDefinition,
  pathSegment: string,
): string | null {
  const segment = pathSegment.trim();
  if (!segment) {
    return null;
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (meta.relation?.type !== "one-to-many") {
      continue;
    }

    const targetEntity = meta.relation.target;
    if (!targetEntity) {
      continue;
    }

    if (fieldName === segment || targetEntity === segment) {
      return fieldName;
    }
  }

  return null;
}

function resolveOneToManyLayoutFieldLeaf(
  definition: FieldPathValidationDefinition,
  firstSegment: string,
  subField: string,
  resolveTarget?: LayoutFieldLeafLookup,
): ResolvedLayoutFieldLeaf | null {
  const oneToManyField = resolveOneToManyRelationFieldName(
    definition,
    firstSegment,
  );
  if (oneToManyField) {
    const childEntity = definition.fields[oneToManyField]?.relation?.target;
    const childDefinition =
      childEntity && resolveTarget ? resolveTarget(childEntity) : undefined;
    if (childDefinition && !(subField in childDefinition.fields)) {
      return null;
    }

    return {
      rootRelationField: oneToManyField,
      leafDefinition: childDefinition ?? definition,
      leafFieldName: subField,
      pathPrefix: firstSegment,
      leafEntityName: childDefinition?.name ?? childEntity ?? firstSegment,
    };
  }

  if (resolveTarget) {
    const reverseChild = resolveTarget(firstSegment);
    if (reverseChild && subField in reverseChild.fields) {
      for (const meta of Object.values(reverseChild.fields)) {
        if (
          meta.relation?.target === definition.name &&
          (meta.relation.type === "many-to-one" ||
            meta.relation.type === "one-to-one")
        ) {
          return {
            rootRelationField: null,
            leafDefinition: reverseChild,
            leafFieldName: subField,
            pathPrefix: firstSegment,
            leafEntityName: reverseChild.name,
          };
        }
      }
    }
  }

  return null;
}

export function resolveLayoutFieldLeaf(
  definition: FieldPathValidationDefinition,
  fieldPath: string,
  resolveTarget?: LayoutFieldLeafLookup,
): ResolvedLayoutFieldLeaf | null {
  const trimmedPath = fieldPath.trim();
  if (!trimmedPath) {
    return null;
  }

  if (!trimmedPath.includes(".")) {
    if (
      trimmedPath in definition.fields ||
      trimmedPath === "createdAt" ||
      trimmedPath === "updatedAt"
    ) {
      return {
        rootRelationField: null,
        leafDefinition: definition,
        leafFieldName: trimmedPath,
        pathPrefix: "",
        leafEntityName: definition.name,
      };
    }

    return null;
  }

  const segments = trimmedPath.split(".");
  if (segments.length === 2) {
    const [firstSegment, subField] = segments;
    if (!firstSegment || !subField) {
      return null;
    }

    const relationField = resolveRelationFieldName(definition, firstSegment);
    if (relationField) {
      const relationMeta = definition.fields[relationField]?.relation;
      if (
        relationMeta?.type !== "many-to-one" &&
        relationMeta?.type !== "one-to-one"
      ) {
        return null;
      }

      const targetDefinition =
        relationMeta.target && resolveTarget
          ? resolveTarget(relationMeta.target)
          : undefined;

      if (targetDefinition && !(subField in targetDefinition.fields)) {
        return null;
      }

      return {
        rootRelationField: relationField,
        leafDefinition: targetDefinition ?? definition,
        leafFieldName: subField,
        pathPrefix: firstSegment,
        leafEntityName:
          targetDefinition?.name ?? relationMeta.target ?? firstSegment,
      };
    }

    return resolveOneToManyLayoutFieldLeaf(
      definition,
      firstSegment,
      subField,
      resolveTarget,
    );
  }

  let currentDefinition = definition;
  let rootRelationField: string | null = null;
  let pathPrefix = "";
  const remaining = [...segments];

  while (remaining.length > 1) {
    const firstSegment = remaining[0];
    if (!firstSegment) {
      return null;
    }

    const relationField = resolveRelationFieldName(
      currentDefinition,
      firstSegment,
    );
    if (!relationField) {
      if (remaining.length === 2) {
        return resolveOneToManyLayoutFieldLeaf(
          definition,
          firstSegment,
          remaining[1] ?? "",
          resolveTarget,
        );
      }
      return null;
    }

    const relationMeta = currentDefinition.fields[relationField]?.relation;
    if (
      relationMeta?.type !== "many-to-one" &&
      relationMeta?.type !== "one-to-one"
    ) {
      return null;
    }

    if (rootRelationField === null) {
      rootRelationField = resolveRelationFieldName(definition, firstSegment);
    }

    const targetEntity = relationMeta.target;
    if (!targetEntity) {
      return null;
    }

    const targetDefinition = resolveTarget?.(targetEntity);
    if (!targetDefinition) {
      return null;
    }

    pathPrefix = pathPrefix ? `${pathPrefix}.${firstSegment}` : firstSegment;
    remaining.shift();
    currentDefinition = targetDefinition;
  }

  const leafFieldName = remaining[0];
  if (!leafFieldName || !(leafFieldName in currentDefinition.fields)) {
    return null;
  }

  return {
    rootRelationField,
    leafDefinition: currentDefinition,
    leafFieldName,
    pathPrefix,
    leafEntityName: currentDefinition.name,
  };
}

export function collectNestedRelationLayoutFieldPaths(
  definition: FieldPathValidationDefinition,
  params?: {
    readonly resolveTarget?: LayoutFieldLeafLookup;
  },
  options: Set<string> = new Set<string>(),
  aliasPrefix = "",
  relationDepth = 0,
): Set<string> {
  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (meta.type === "document") {
      continue;
    }

    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one")
    ) {
      continue;
    }

    if (meta.relation?.type === "one-to-many") {
      continue;
    }

    const path = aliasPrefix ? `${aliasPrefix}.${fieldName}` : fieldName;
    options.add(path);
  }

  if (relationDepth >= MAX_LAYOUT_RELATION_HOPS) {
    return options;
  }

  for (const [, meta] of Object.entries(definition.fields)) {
    if (
      !meta.relation ||
      (meta.relation.type !== "many-to-one" &&
        meta.relation.type !== "one-to-one")
    ) {
      continue;
    }

    const target = meta.relation.target;
    if (!target) {
      continue;
    }

    const nextPrefix = aliasPrefix ? `${aliasPrefix}.${target}` : target;
    const targetDefinition = params?.resolveTarget?.(target);

    if (!targetDefinition) {
      for (const subfield of ["name", "code"] as const) {
        options.add(`${nextPrefix}.${subfield}`);
      }
      continue;
    }

    collectNestedRelationLayoutFieldPaths(
      targetDefinition,
      params,
      options,
      nextPrefix,
      relationDepth + 1,
    );
  }

  return options;
}
