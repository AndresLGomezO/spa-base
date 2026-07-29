import { z } from "zod";

import {
  createLocalePackInputSchema,
  type CreateLocalePackInput,
  type LocalePack,
  type PortableLocalePack,
} from "./types.js";

export const LOCALE_PACK_JSON_VERSION = 1 as const;
export const LOCALE_PACK_JSON_KIND = "locale-pack-definition" as const;
export const LOCALE_PACKS_CATALOG_JSON_KIND = "locale-packs-catalog" as const;

export interface LocalePackJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly LocalePackJsonError[];
    };

const portableLocalePackSchema = createLocalePackInputSchema;

export type LocalePackFormData = z.infer<typeof portableLocalePackSchema>;

const localePackEnvelopeSchema = z.object({
  kind: z.literal(LOCALE_PACK_JSON_KIND),
  version: z.literal(LOCALE_PACK_JSON_VERSION),
  data: portableLocalePackSchema,
});

const localePacksCatalogEnvelopeSchema = z.object({
  kind: z.literal(LOCALE_PACKS_CATALOG_JSON_KIND),
  version: z.literal(LOCALE_PACK_JSON_VERSION),
  exportedAt: z.string().datetime().optional(),
  localePacks: z.array(portableLocalePackSchema).min(1),
});

export type LocalePacksCatalogEnvelope = z.infer<
  typeof localePacksCatalogEnvelopeSchema
>;

export interface LocalePackCatalogReplacePlan {
  readonly toCreate: readonly CreateLocalePackInput[];
  readonly toUpdate: readonly {
    readonly existing: LocalePack;
    readonly input: CreateLocalePackInput;
  }[];
  readonly toDelete: readonly LocalePack[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly LocalePackJsonError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "$",
    message: issue.message,
  }));
}

function parseJsonText(text: string): JsonImportResult<unknown> {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      errors: [{ path: "$", message: "Invalid JSON." }],
    };
  }
}

function validateUniqueLocales(
  packs: readonly PortableLocalePack[],
): readonly LocalePackJsonError[] {
  const seen = new Map<string, number>();
  const errors: LocalePackJsonError[] = [];
  for (const [index, pack] of packs.entries()) {
    const previous = seen.get(pack.locale);
    if (previous !== undefined) {
      errors.push({
        path: `localePacks.${index}.locale`,
        message: `Duplicate locale "${pack.locale}" (also at index ${previous}).`,
      });
    } else {
      seen.set(pack.locale, index);
    }
  }
  return errors;
}

export function toPortableLocalePack(record: LocalePack): PortableLocalePack {
  return {
    locale: record.locale,
    messages: record.messages,
  };
}

export function createLocalePackEnvelope(data: LocalePackFormData): {
  readonly kind: typeof LOCALE_PACK_JSON_KIND;
  readonly version: typeof LOCALE_PACK_JSON_VERSION;
  readonly data: LocalePackFormData;
} {
  return {
    kind: LOCALE_PACK_JSON_KIND,
    version: LOCALE_PACK_JSON_VERSION,
    data,
  };
}

export function createLocalePacksCatalogEnvelope(
  packs: readonly LocalePack[],
  options?: { readonly exportedAt?: string },
): LocalePacksCatalogEnvelope {
  return {
    kind: LOCALE_PACKS_CATALOG_JSON_KIND,
    version: LOCALE_PACK_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    localePacks: packs.map(toPortableLocalePack),
  };
}

export function parseLocalePackJson(
  text: string,
): JsonImportResult<LocalePackFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = localePackEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function validateLocalePackImport(
  text: string,
): JsonImportResult<LocalePackFormData> {
  return parseLocalePackJson(text);
}

export function parseLocalePacksCatalogJson(
  text: string,
): JsonImportResult<LocalePacksCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  return validateLocalePacksCatalogEnvelope(parsed.data);
}

export function validateLocalePacksCatalogEnvelope(
  input: unknown,
): JsonImportResult<LocalePacksCatalogEnvelope> {
  const result = localePacksCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const uniqueErrors = validateUniqueLocales(result.data.localePacks);
  if (uniqueErrors.length > 0) {
    return { ok: false, errors: uniqueErrors };
  }

  return { ok: true, data: result.data };
}

export function computeLocalePackCatalogReplacePlan(input: {
  readonly existing: readonly LocalePack[];
  readonly imported: readonly CreateLocalePackInput[];
}): LocalePackCatalogReplacePlan {
  const existingByLocale = new Map(
    input.existing.map((record) => [record.locale, record]),
  );

  const toCreate: CreateLocalePackInput[] = [];
  const toUpdate: LocalePackCatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: LocalePack[] = [];

  for (const imported of input.imported) {
    const existing = existingByLocale.get(imported.locale);
    if (existing) {
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  const importedLocales = new Set(
    input.imported.map((record) => record.locale),
  );
  for (const existing of input.existing) {
    if (!importedLocales.has(existing.locale)) {
      toDelete.push(existing);
    }
  }

  return {
    toCreate,
    toUpdate,
    toDelete,
    counts: {
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    },
  };
}

export { localePacksCatalogEnvelopeSchema };
