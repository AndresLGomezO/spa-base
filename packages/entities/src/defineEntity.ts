/**
 * Assembles a defined entity: three Zod schemas, normalized metadata, and CRUD permissions.
 *
 * Outputs are consumed by CRUD API (WS2), Firestore DAL (WS3), RBAC (WS4), and dynamic UI (WS5).
 * This module must stay free of Firestore, HTTP, and UI dependencies.
 *
 * @see packages/entities/README.md
 */
import { buildEntitySchemas } from "./schema/buildEntitySchemas.js";
import { buildFieldMetadata } from "./metadata/buildMetadata.js";
import {
  buildPermissions,
  defaultCollectionName,
} from "./metadata/buildPermissions.js";
import { extendEntitySchemaWithSearchMirrors } from "./search/search-mirror-fields.js";
import { resolveEntityUI } from "./ui/default-ui-config.js";
import { validateEntityUIConfig } from "./ui/validate-ui-config.js";
import { SYSTEM_FIELDS } from "./systemFields.js";
import type {
  AssertNoSystemFields,
  DefinedEntity,
  EntityConfig,
  EntityMetadata,
  FieldDefinitions,
} from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export function defineEntity<
  const TName extends string,
  const TFields extends FieldDefinitions,
>(
  config: EntityConfig<TName, TFields>,
): DefinedEntity<TName, AssertNoSystemFields<TFields>> {
  const collection = config.collection ?? defaultCollectionName(config.name);
  const fields = config.fields as AssertNoSystemFields<TFields>;
  const normalizedFields = buildFieldMetadata(fields);
  const { schema, createSchema, updateSchema } = buildEntitySchemas(fields);

  const draftEntity = {
    name: config.name,
    metadata: {
      name: config.name,
      collection,
      fields: normalizedFields,
    },
  } as unknown as DefinedEntity<string, FieldDefinitions>;

  const ui = config.ui
    ? resolveEntityUI(
        draftEntity,
        validateEntityUIConfig(draftEntity, config.ui),
      )
    : undefined;

  const metadata: EntityMetadata<TName, AssertNoSystemFields<TFields>> = {
    name: config.name,
    collection,
    fields: normalizedFields,
    systemFields: SYSTEM_FIELDS,
    schema,
    createSchema,
    updateSchema,
    permissions: buildPermissions(config.name),
    ...(ui ? { ui } : {}),
    ...(config.tenantWideRead ? { tenantWideRead: true } : {}),
    ...(config.inMemoryListQueries ? { inMemoryListQueries: true } : {}),
    ...(config.hiddenFromNav ? { hiddenFromNav: true } : {}),
    ...(config.emailMatchingEnabled ? { emailMatchingEnabled: true } : {}),
    ...(config.navCategoryId ? { navCategoryId: config.navCategoryId } : {}),
    ...(config.navOrder !== undefined ? { navOrder: config.navOrder } : {}),
    ...(config.displayField ? { displayField: config.displayField } : {}),
    ...(config.description ? { description: config.description } : {}),
  };

  const entity = {
    name: config.name,
    metadata,
    schema,
    createSchema,
    updateSchema,
  } as DefinedEntity<TName, AssertNoSystemFields<TFields>>;

  return extendEntitySchemaWithSearchMirrors(
    entity as AnyDefinedEntity,
  ) as DefinedEntity<TName, AssertNoSystemFields<TFields>>;
}
