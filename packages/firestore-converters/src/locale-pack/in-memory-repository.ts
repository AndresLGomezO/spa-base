import {
  createLocalePackInputSchema,
  localePackSchema,
  patchLocalePackInputSchema,
  type LocalePack,
} from "@repo/locale-packs/types";

import type { LocalePackRepository } from "./repository-contract.js";

export function createInMemoryLocalePackRepository(): LocalePackRepository & {
  readonly store: Map<string, LocalePack>;
} {
  const store = new Map<string, LocalePack>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()].filter(
        (record) => record.tenantId === tenantId,
      );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async getByLocale(tenantId, locale) {
      return (
        (await this.list(tenantId)).find(
          (record) => record.locale === locale,
        ) ?? null
      );
    },
    async create(tenantId, input) {
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
      store.set(key(tenantId, id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
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
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
  };
}
