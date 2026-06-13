import {
  createUiBuilderSuggestionInputSchema,
  UI_BUILDER_AI_SUGGESTIONS_COLLECTION,
  uiBuilderSuggestionRecordSchema,
} from "@repo/ai-engine/schemas";
import { nanoid } from "nanoid";

import type { UiBuilderAiSuggestionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminUiBuilderAiSuggestionRepository(
  config: FirebaseAdminConfig,
): UiBuilderAiSuggestionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      UI_BUILDER_AI_SUGGESTIONS_COLLECTION,
    );
  }

  return {
    async create(tenantId, input) {
      const parsed = createUiBuilderSuggestionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `aisug_${nanoid(12)}`;
      const record = uiBuilderSuggestionRecordSchema.parse({
        id,
        tenantId,
        ...parsed,
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return uiBuilderSuggestionRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async listByEntityAndSurface(tenantId, entityName, surface) {
      const snapshot = await collection(tenantId)
        .where("entityName", "==", entityName)
        .limit(100)
        .get();

      return snapshot.docs
        .map((doc) =>
          uiBuilderSuggestionRecordSchema.parse({
            id: doc.id,
            ...doc.data(),
          }),
        )
        .filter((record) => record.surface === surface)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 50);
    },
  };
}
