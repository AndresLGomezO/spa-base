import { z } from "zod";

import { LOCALE_PACK_PERMISSIONS } from "./permissions.js";

export { LOCALE_PACK_PERMISSIONS };

export const LOCALE_PACKS_COLLECTION = "__locale_packs" as const;

/** BCP-47-ish locale code (en, es, es-CO). */
export const localeCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[a-z]{2}(-[A-Za-z0-9]+)?$/, "Invalid locale code");

export const localeMessagesSchema = z.record(z.string(), z.string());

export type LocaleMessages = z.infer<typeof localeMessagesSchema>;

const localePackBodySchema = z.object({
  locale: localeCodeSchema,
  messages: localeMessagesSchema.default({}),
});

export const createLocalePackInputSchema = localePackBodySchema;

export const patchLocalePackInputSchema = z.object({
  locale: localeCodeSchema.optional(),
  messages: localeMessagesSchema.optional(),
});

export type CreateLocalePackInput = z.infer<typeof createLocalePackInputSchema>;

export type PatchLocalePackInput = z.infer<typeof patchLocalePackInputSchema>;

export const localePackSchema = localePackBodySchema.extend({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LocalePack = z.infer<typeof localePackSchema>;

export type PortableLocalePack = z.infer<typeof localePackBodySchema>;

export type { LocalePackRepository } from "./repository-contract.js";
