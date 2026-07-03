import {
  createFormulaDefinitionInputSchema,
  FORMULA_DEFINITIONS_COLLECTION,
  formulaDefinitionSchema,
  patchFormulaDefinitionInputSchema,
  type CreateFormulaDefinitionInput,
  type FormulaDefinition,
  type PatchFormulaDefinitionInput,
} from "@repo/formula-definitions/types";
import { nanoid } from "nanoid";

import type { FormulaDefinitionRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): FormulaDefinition {
  return formulaDefinitionSchema.parse(data);
}

export function createFirestoreAdminFormulaDefinitionRepository(
  config: FirebaseAdminConfig,
): FormulaDefinitionRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      FORMULA_DEFINITIONS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
    async listEnabled(tenantId) {
      const snapshot = await collection(tenantId)
        .where("enabled", "==", true)
        .get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async create(tenantId, input: CreateFormulaDefinitionInput) {
      const parsed = createFormulaDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `formula_${nanoid(12)}`;
      const record = formulaDefinitionSchema.parse({
        id,
        tenantId,
        source: "tenant",
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        inputs: parsed.inputs,
        body: parsed.body,
        enabled: parsed.enabled,
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchFormulaDefinitionInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Formula definition not found: ${id}`);
      }
      if (current.source === "platform") {
        throw new Error(`Platform formula "${current.name}" is read-only.`);
      }

      patchFormulaDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = formulaDefinitionSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.inputs ? { inputs: input.inputs } : {}),
        ...(input.body ? { body: input.body } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      const current = await this.getById(tenantId, id);
      if (current?.source === "platform") {
        throw new Error(
          `Platform formula "${current.name}" cannot be deleted.`,
        );
      }
      await collection(tenantId).doc(id).delete();
    },
  };
}
