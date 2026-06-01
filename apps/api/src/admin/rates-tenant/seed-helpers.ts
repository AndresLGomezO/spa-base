import {
  defineEntityFromRecord,
  registerDynamicEntity,
  type CreateEntityDefinitionInput,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import type { CreateEntityCategoryInput } from "@repo/entity-categories";
import type { CreateTenantRoleInput } from "@repo/rbac";
import { createEntityConverter } from "@repo/firestore-converters";
import type {
  EntityCategoryRepository,
  EntityDefinitionRepository,
  TenantRoleRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import {
  applySearchMirrorFields,
  listLegacySearchMirrorFieldNames,
  listSearchMirrorStorageFields,
  type DefinedEntity,
} from "@repo/entities";

import { RATES_TENANT_ID } from "./constants.js";

type GenericRecord = { readonly id: string; readonly tenantId: string };

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function ratesDefinitionNeedsSync(
  existing: EntityDefinitionRecord,
  desired: CreateEntityDefinitionInput,
): boolean {
  return (
    Boolean(existing.hiddenFromNav) !== Boolean(desired.hiddenFromNav) ||
    Boolean(existing.tenantWideRead) !== Boolean(desired.tenantWideRead) ||
    existing.navCategoryId !== desired.navCategoryId ||
    existing.navOrder !== desired.navOrder ||
    (existing.displayField ?? "name") !== (desired.displayField ?? "name") ||
    stableJson(existing.fields) !== stableJson(desired.fields) ||
    stableJson(existing.ui) !== stableJson(desired.ui)
  );
}

export async function seedRatesCategories(
  repository: EntityCategoryRepository,
  categories: readonly CreateEntityCategoryInput[],
): Promise<Readonly<Record<string, string>>> {
  const existing = await repository.list(RATES_TENANT_ID);
  const byName = new Map(existing.map((item) => [item.name, item.id]));

  for (const category of categories) {
    if (byName.has(category.name)) {
      continue;
    }
    const created = await repository.create(RATES_TENANT_ID, category);
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

export async function seedRatesDefinitions(
  repository: EntityDefinitionRepository,
  definitions: readonly CreateEntityDefinitionInput[],
): Promise<readonly EntityDefinitionRecord[]> {
  const created: EntityDefinitionRecord[] = [];

  for (const definition of definitions) {
    const existing = await repository.getByName(
      RATES_TENANT_ID,
      definition.name,
    );
    if (existing) {
      if (ratesDefinitionNeedsSync(existing, definition)) {
        const record = await repository.update(RATES_TENANT_ID, existing.id, {
          label: definition.label,
          fields: definition.fields,
          ui: definition.ui,
          hiddenFromNav: definition.hiddenFromNav,
          tenantWideRead: definition.tenantWideRead,
          navCategoryId: definition.navCategoryId,
          navOrder: definition.navOrder,
          displayField: definition.displayField,
        });
        registerDynamicEntity(RATES_TENANT_ID, record);
        created.push(record);
      } else {
        registerDynamicEntity(RATES_TENANT_ID, existing);
        created.push(existing);
      }
      continue;
    }

    const record = await repository.create(RATES_TENANT_ID, definition);
    registerDynamicEntity(RATES_TENANT_ID, record);
    created.push(record);
  }

  return created;
}

export async function ensureRatesRole(
  repository: TenantRoleRepository,
  input: CreateTenantRoleInput,
): Promise<void> {
  const existing = await repository.getByName(RATES_TENANT_ID, input.name);
  if (existing) {
    const grantsMatch =
      stableJson([...existing.grants].sort()) ===
      stableJson([...input.grants].sort());
    const descriptionMatch =
      (existing.description ?? "") === (input.description ?? "");
    if (grantsMatch && descriptionMatch) {
      return;
    }

    await repository.update(RATES_TENANT_ID, existing.id, {
      grants: [...input.grants],
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
    });
    return;
  }

  await repository.create(RATES_TENANT_ID, input);
}

function buildSeedRecord(
  business: Record<string, unknown>,
  id: string,
  ownerId: string,
  now: string,
): Record<string, unknown> {
  return {
    ...business,
    id,
    tenantId: RATES_TENANT_ID,
    createdAt: now,
    updatedAt: now,
    ownerId,
    accessUserIds: [ownerId],
    sharedWith: {},
  };
}

function createRatesEntityRepository(
  firebaseAdminConfig: FirebaseAdminConfig,
  entity: DefinedEntity<string, import("@repo/entities").FieldDefinitions>,
): TenantScopedEntityRepository<GenericRecord, unknown> {
  return createFirestoreAdminEntityRepository({
    config: firebaseAdminConfig,
    collection: entity.metadata.collection,
    converter: createEntityConverter(entity),
  });
}

async function ensureRatesRecord(
  repository: TenantScopedEntityRepository<GenericRecord, unknown>,
  entity: DefinedEntity<string, import("@repo/entities").FieldDefinitions>,
  id: string,
  ownerId: string,
  business: Record<string, unknown>,
): Promise<void> {
  const existing = await repository.findById(id, RATES_TENANT_ID);
  const now = new Date().toISOString();
  const draft = applySearchMirrorFields(
    entity,
    buildSeedRecord(business, id, ownerId, now),
  );

  if (existing) {
    const existingRecord = existing as Record<string, unknown>;
    const withMirrors = applySearchMirrorFields(entity, {
      ...existingRecord,
      ...business,
    });
    const needsTokenSync = listSearchMirrorStorageFields(entity).some(
      (field) => withMirrors[field] !== existingRecord[field],
    );
    const hasLegacyData = listLegacySearchMirrorFieldNames(entity).some(
      (field) => field in existingRecord,
    );

    if (needsTokenSync || hasLegacyData) {
      const parsed = entity.schema.parse(withMirrors);
      await repository.update(id, RATES_TENANT_ID, parsed as GenericRecord);
    }
    return;
  }

  const parsed = entity.schema.parse(draft);
  await repository.create(RATES_TENANT_ID, parsed as GenericRecord);
}

function entityFromDefinition(
  record: EntityDefinitionRecord,
): DefinedEntity<string, import("@repo/entities").FieldDefinitions> {
  return defineEntityFromRecord(record);
}

export type RatesRecordSeedContext = {
  readonly config: FirebaseAdminConfig;
  readonly entities: Map<
    string,
    DefinedEntity<string, import("@repo/entities").FieldDefinitions>
  >;
  readonly ownerId: string;
};

export function createRatesRecordSeedContext(
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
): RatesRecordSeedContext {
  return {
    config: firebaseAdminConfig,
    entities: new Map(
      definitionRecords.map((record) => [
        record.name,
        entityFromDefinition(record),
      ]),
    ),
    ownerId,
  };
}

export async function ensureRatesRecordInContext(
  context: RatesRecordSeedContext,
  entityName: string,
  id: string,
  business: Record<string, unknown>,
): Promise<void> {
  const entity = context.entities.get(entityName);
  if (!entity) {
    throw new Error(`Entity "${entityName}" is not registered for rates seed.`);
  }

  const repository = createRatesEntityRepository(context.config, entity);
  await ensureRatesRecord(repository, entity, id, context.ownerId, business);
}
