import {
  DOCUMENT_EXTRACTION_TEMPLATES_COLLECTION,
  createDocumentExtractionTemplateInputSchema,
  documentExtractionTemplateRecordSchema,
  patchDocumentExtractionTemplateInputSchema,
  type CreateDocumentExtractionTemplateInput,
  type DocumentExtractionTemplateRecord,
  type DocumentExtractionTemplateRepository,
  type PatchDocumentExtractionTemplateInput,
} from "@repo/ai-context";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): DocumentExtractionTemplateRecord {
  return documentExtractionTemplateRecordSchema.parse(data);
}

export function createFirestoreAdminDocumentExtractionTemplateRepository(
  config: FirebaseAdminConfig,
): DocumentExtractionTemplateRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      DOCUMENT_EXTRACTION_TEMPLATES_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs
        .map((doc) => toRecord({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
    async get(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async create(tenantId, input: CreateDocumentExtractionTemplateInput) {
      const parsed = createDocumentExtractionTemplateInputSchema.parse(input);
      const now = new Date().toISOString();
      const record = documentExtractionTemplateRecordSchema.parse({
        ...parsed,
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(record.id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchDocumentExtractionTemplateInput) {
      const current = await this.get(tenantId, id);
      if (!current) {
        throw new Error(`Document extraction template not found: ${id}`);
      }
      patchDocumentExtractionTemplateInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = documentExtractionTemplateRecordSchema.parse({
        ...current,
        ...input,
        id: current.id,
        tenantId: current.tenantId,
        createdAt: current.createdAt,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
    async delete(tenantId, id) {
      await collection(tenantId).doc(id).delete();
    },
  };
}
