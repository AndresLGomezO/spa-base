import {
  createLocalePackInputSchema,
  LOCALE_PACKS_COLLECTION,
  localePackSchema,
  patchLocalePackInputSchema,
  type CreateLocalePackInput,
  type LocalePack,
  type PatchLocalePackInput,
} from "@repo/locale-packs/types";

import type { LocalePackRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

function toRecord(data: unknown): LocalePack {
  return localePackSchema.parse(data);
}

export function createFirestoreAdminLocalePackRepository(
  config: FirebaseAdminConfig,
): LocalePackRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      LOCALE_PACKS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs.map((doc) =>
        toRecord({ id: doc.id, ...doc.data() }),
      );
    },
    async getById(tenantId, id) {
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return toRecord({ id: snapshot.id, ...snapshot.data() });
    },
    async getByLocale(tenantId, locale) {
      const snapshot = await collection(tenantId)
        .where("locale", "==", locale)
        .limit(1)
        .get();
      const doc = snapshot.docs[0];
      if (!doc) return null;
      return toRecord({ id: doc.id, ...doc.data() });
    },
    async create(tenantId, input: CreateLocalePackInput) {
      const parsed = createLocalePackInputSchema.parse(input);
      const existing = await this.getByLocale(tenantId, parsed.locale);
      if (existing) {
        throw new Error(
          `Locale pack already exists for locale: ${parsed.locale}`,
        );
      }
      const now = new Date().toISOString();
      const id = parsed.locale;
      const record = localePackSchema.parse({
        id,
        tenantId,
        locale: parsed.locale,
        messages: parsed.messages,
        createdAt: now,
        updatedAt: now,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async update(tenantId, id, input: PatchLocalePackInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Locale pack not found: ${id}`);
      }

      patchLocalePackInputSchema.parse(input);
      if (input.locale && input.locale !== current.locale) {
        const clash = await this.getByLocale(tenantId, input.locale);
        if (clash && clash.id !== id) {
          throw new Error(
            `Locale pack already exists for locale: ${input.locale}`,
          );
        }
      }

      const now = new Date().toISOString();
      const next = localePackSchema.parse({
        ...current,
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.messages ? { messages: input.messages } : {}),
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
