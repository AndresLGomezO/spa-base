import type { SerializableEntityDefinition } from "@repo/entities";
import type { FieldPathValidationDefinition } from "@repo/ui-builder-core";
import { listLayoutFieldOptions } from "@repo/ui-builder-core";

export const ENTITY_TENANT_FRAGMENT_ID = "entity.tenant";
export const ENTITY_CATALOG_FRAGMENT_ID = "entity.catalog";
export const ENTITY_CURRENT_FRAGMENT_ID = "entity.current";

export interface EntityTenantSummaryInput {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly tenantStatus: "active" | "suspended";
}

export interface EntityCatalogEntitySummary {
  readonly name: string;
  readonly label: string;
  readonly displayField?: string;
  readonly navCategoryName?: string;
  readonly relationEdges: readonly {
    readonly field: string;
    readonly target: string;
    readonly type: string;
  }[];
}

export interface EntityCatalogBuildInput {
  readonly tenant: EntityTenantSummaryInput;
  readonly entities: readonly EntityCatalogEntitySummary[];
}

export interface EntityContextBuildInput {
  readonly entity: SerializableEntityDefinition;
  readonly layoutFieldPaths: readonly string[];
  readonly formFieldPaths: readonly string[];
  readonly entityFieldSelectorPaths: readonly string[];
}

function formatFieldLabel(
  entity: SerializableEntityDefinition,
  fieldName: string,
): string {
  return entity.ui.fields?.[fieldName]?.label ?? fieldName;
}

export function toFieldPathValidationDefinition(
  entity: SerializableEntityDefinition,
): FieldPathValidationDefinition {
  const fields: Record<
    string,
    FieldPathValidationDefinition["fields"][string]
  > = {};
  for (const [name, meta] of Object.entries(entity.fields)) {
    fields[name] = {
      type: meta.type,
      ...(meta.relation ? { relation: meta.relation } : {}),
    };
  }
  return { name: entity.name, fields };
}

export function resolveLayoutFieldPathsForEntity(
  entity: SerializableEntityDefinition,
  resolveTarget: (target: string) => FieldPathValidationDefinition | undefined,
): readonly string[] {
  const definition = toFieldPathValidationDefinition(entity);
  return listLayoutFieldOptions(definition, { resolveTarget });
}

export function buildEntityTenantFragment(
  input: EntityTenantSummaryInput,
): string {
  return `# Tenant

- **Name:** ${input.tenantName}
- **Id:** ${input.tenantId}
- **Status:** ${input.tenantStatus}
`;
}

export function buildEntityCatalogFragment(
  input: EntityCatalogBuildInput,
): string {
  const entityLines = input.entities.map((entity) => {
    const relations =
      entity.relationEdges.length > 0
        ? entity.relationEdges
            .map((edge) => `${edge.field} → ${edge.target} (${edge.type})`)
            .join("; ")
        : "none";
    return `- **${entity.label}** (\`${entity.name}\`) — display: \`${entity.displayField ?? "id"}\`${entity.navCategoryName ? `, category: ${entity.navCategoryName}` : ""}; relations: ${relations}`;
  });

  return `# Entity catalog

${entityLines.join("\n")}
`;
}

export function buildEntityCurrentFragment(
  input: EntityContextBuildInput,
): string {
  const { entity } = input;
  const label = entity.ui.nav?.label ?? entity.name;

  const fieldLines: string[] = [];
  for (const [name, meta] of Object.entries(entity.fields)) {
    const parts = [
      `- **${formatFieldLabel(entity, name)}** (\`${name}\`)`,
      `type: ${meta.type}`,
      meta.required ? "required" : "optional",
    ];
    if (meta.sensitive) {
      parts.push("sensitive (do not display raw values)");
    }
    if (meta.isArray) {
      parts.push("array");
    }
    if (meta.enumValues?.length) {
      parts.push(`enum: ${meta.enumValues.join(" | ")}`);
    }
    if (meta.relation) {
      parts.push(`relation → ${meta.relation.target} (${meta.relation.type})`);
    }
    if (meta.type === "image" || meta.type === "document") {
      parts.push("file schema: { storagePath, contentType, fileName }");
      if (meta.maxSizeBytes !== undefined) {
        parts.push(`maxSizeBytes: ${meta.maxSizeBytes}`);
      }
    }
    const uiMeta = entity.ui.fields?.[name];
    if (uiMeta?.component) {
      parts.push(`component: ${uiMeta.component}`);
    }
    fieldLines.push(parts.join(", "));
  }

  return `# Current entity: ${label} (\`${entity.name}\`)

Collection: \`${entity.collection}\`
Display field: \`${entity.displayField ?? "id"}\`

## Fields
${fieldLines.join("\n")}

## Valid layout field paths (display)
${input.layoutFieldPaths.map((path) => `- \`${path}\``).join("\n")}

## Valid form field paths (inputs)
${input.formFieldPaths.map((path) => `- \`${path}\``).join("\n")}

## Valid entity-field-selector paths
${input.entityFieldSelectorPaths.map((path) => `- \`${path}\``).join("\n")}

_Do not bind or display sensitive field values._
`;
}

export function extractCatalogSummaries(
  entities: readonly SerializableEntityDefinition[],
  categoryNames: Readonly<Record<string, string>>,
): readonly EntityCatalogEntitySummary[] {
  return entities.map((entity) => ({
    name: entity.name,
    label: entity.ui.nav?.label ?? entity.name,
    ...(entity.displayField ? { displayField: entity.displayField } : {}),
    ...(entity.navCategoryId && categoryNames[entity.navCategoryId]
      ? { navCategoryName: categoryNames[entity.navCategoryId] }
      : {}),
    relationEdges: Object.entries(entity.fields).flatMap(([field, meta]) =>
      meta.relation
        ? [
            {
              field,
              target: meta.relation.target,
              type: meta.relation.type,
            },
          ]
        : [],
    ),
  }));
}
