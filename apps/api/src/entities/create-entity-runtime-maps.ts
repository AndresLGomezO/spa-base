import { getAllEntities } from "@repo/entities";
import type {
  EntityQueryExecutor,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import { createEntityConverter } from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityRepository,
  createFirestoreEntityQueryExecutor,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { getEntityConverter } from "./entity-converter-registry.js";

type GenericRecord = { readonly id: string; readonly tenantId: string };

interface EntityRuntimeMaps {
  readonly repositories: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >;
  readonly queryExecutors: Record<string, EntityQueryExecutor>;
}

export function createEntityRuntimeMaps(
  firebaseAdminConfig: FirebaseAdminConfig,
  options: {
    readonly repositories?: Record<
      string,
      TenantScopedEntityRepository<GenericRecord, unknown>
    >;
    readonly queryExecutors?: Record<string, EntityQueryExecutor>;
  } = {},
): EntityRuntimeMaps {
  const repositories: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  > = { ...options.repositories };
  const queryExecutors: Record<string, EntityQueryExecutor> = {
    ...options.queryExecutors,
  };

  for (const entity of getAllEntities()) {
    const converter =
      getEntityConverter(entity.name) ?? createEntityConverter(entity);
    if (!converter) {
      throw new Error(
        `No Firestore converter registered for entity "${entity.name}".`,
      );
    }

    if (!repositories[entity.name]) {
      repositories[entity.name] = createFirestoreAdminEntityRepository({
        config: firebaseAdminConfig,
        collection: entity.metadata.collection,
        converter,
      });
    }

    if (!queryExecutors[entity.name]) {
      queryExecutors[entity.name] = createFirestoreEntityQueryExecutor({
        config: firebaseAdminConfig,
        collection: entity.metadata.collection,
        converter,
      });
    }
  }

  return { repositories, queryExecutors };
}
