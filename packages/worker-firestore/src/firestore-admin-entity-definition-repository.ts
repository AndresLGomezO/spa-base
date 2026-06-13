import {
  entityDefinitionRecordSchema,
  ENTITY_DEFINITIONS_COLLECTION,
} from "@repo/dynamic-entities";

import type { EntityDefinitionRepository } from "./entity-definition-repository-contract.js";
import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown) {
  return entityDefinitionRecordSchema.parse(data);
}

export function createFirestoreAdminEntityDefinitionRepository(
  config: FirebaseAdminConfig,
): Pick<EntityDefinitionRepository, "getByName"> {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      ENTITY_DEFINITIONS_COLLECTION,
    );
  }

  return {
    async getByName(tenantId, name) {
      const snapshot = await collection(tenantId)
        .where("name", "==", name)
        .limit(1)
        .get();
      const doc = snapshot.docs[0];
      if (!doc) return null;
      return toRecord({ id: doc.id, ...doc.data() });
    },
  };
}

export type WorkerEntityDefinitionRepository = Pick<
  EntityDefinitionRepository,
  "getByName"
>;
