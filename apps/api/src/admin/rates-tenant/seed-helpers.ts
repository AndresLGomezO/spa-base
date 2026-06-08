import type {
  CreateEntityDefinitionInput,
  EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import type { CreateEntityCategoryInput } from "@repo/entity-categories";
import type { CreateTenantRoleInput } from "@repo/rbac";
import type {
  EntityCategoryRepository,
  EntityDefinitionRepository,
  TenantRoleRepository,
} from "@repo/firestore-converters";

import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function definitionNeedsSync(
  existing: EntityDefinitionRecord,
  desired: CreateEntityDefinitionInput,
): boolean {
  return (
    Boolean(existing.hiddenFromNav) !== Boolean(desired.hiddenFromNav) ||
    Boolean(existing.tenantWideRead) !== Boolean(desired.tenantWideRead) ||
    existing.navCategoryId !== desired.navCategoryId ||
    existing.navOrder !== desired.navOrder ||
    (existing.displayField ?? "name") !== (desired.displayField ?? "name") ||
    existing.label !== desired.label ||
    stableJson(existing.fields) !== stableJson(desired.fields) ||
    stableJson(existing.ui) !== stableJson(desired.ui)
  );
}

export async function seedRatesCategories(
  repository: EntityCategoryRepository,
  tenantId: string,
  categories: readonly CreateEntityCategoryInput[],
): Promise<Readonly<Record<string, string>>> {
  const existing = await repository.list(tenantId);
  const byName = new Map(existing.map((item) => [item.name, item.id]));

  for (const category of categories) {
    if (byName.has(category.name)) {
      continue;
    }
    const created = await repository.create(tenantId, category);
    byName.set(created.name, created.id);
  }

  const resolved: Record<string, string> = {};
  for (const category of categories) {
    const id = byName.get(category.name);
    if (!id) {
      throw new Error(`Failed to resolve category id for "${category.name}".`);
    }
    resolved[category.name] = id;
  }
  return resolved;
}

interface SeedRatesDefinitionsResult {
  readonly created: number;
  readonly updated: number;
  readonly skipped: number;
  readonly records: readonly EntityDefinitionRecord[];
}

export async function seedRatesDefinitions(
  tenantId: string,
  repository: EntityDefinitionRepository,
  entityRuntime: EntityRuntimeContext,
  definitions: readonly CreateEntityDefinitionInput[],
): Promise<SeedRatesDefinitionsResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const records: EntityDefinitionRecord[] = [];

  await entityRuntime.loadTenantDefinitions(tenantId, { force: true });

  for (const definition of definitions) {
    const existing = await repository.getByName(tenantId, definition.name);
    if (existing) {
      if (definitionNeedsSync(existing, definition)) {
        const record = await repository.update(tenantId, existing.id, {
          label: definition.label,
          fields: definition.fields,
          ui: definition.ui,
          hiddenFromNav: definition.hiddenFromNav,
          tenantWideRead: definition.tenantWideRead,
          navCategoryId: definition.navCategoryId,
          navOrder: definition.navOrder,
          displayField: definition.displayField,
        });
        await entityRuntime.syncDefinition(record, existing);
        records.push(record);
        updated += 1;
      } else {
        await entityRuntime.syncDefinition(existing);
        records.push(existing);
        skipped += 1;
      }
      continue;
    }

    const record = await repository.create(tenantId, definition);
    await entityRuntime.syncDefinition(record);
    records.push(record);
    created += 1;
  }

  return { created, updated, skipped, records };
}

export async function ensureRatesRole(
  repository: TenantRoleRepository,
  tenantId: string,
  input: CreateTenantRoleInput,
): Promise<void> {
  const existing = await repository.getByName(tenantId, input.name);
  if (existing) {
    const grantsMatch =
      stableJson([...existing.grants].sort()) ===
      stableJson([...input.grants].sort());
    const descriptionMatch =
      (existing.description ?? "") === (input.description ?? "");
    if (grantsMatch && descriptionMatch) {
      return;
    }

    await repository.update(tenantId, existing.id, {
      grants: [...input.grants],
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    });
    return;
  }

  await repository.create(tenantId, input);
}
