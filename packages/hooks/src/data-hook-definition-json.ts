import { z } from "zod";

import {
  createDataHookInputSchema,
  type CreateDataHookInput,
  type DataHookDefinition,
} from "./data-hook-definition.js";

export const DATA_HOOK_DEFINITION_JSON_VERSION = 1 as const;
export const DATA_HOOK_DEFINITION_JSON_KIND = "data-hook-definition" as const;
export const DATA_HOOKS_CATALOG_JSON_KIND = "data-hooks-catalog" as const;

export interface DataHookDefinitionJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly DataHookDefinitionJsonError[];
    };

const portableDataHookDefinitionSchema = createDataHookInputSchema.omit({
  tenantId: true,
});

export type PortableDataHookDefinition = z.infer<
  typeof portableDataHookDefinitionSchema
>;

const dataHookDefinitionEnvelopeSchema = z.object({
  kind: z.literal(DATA_HOOK_DEFINITION_JSON_KIND),
  version: z.literal(DATA_HOOK_DEFINITION_JSON_VERSION),
  data: portableDataHookDefinitionSchema,
});

export type DataHookDefinitionFormData = z.infer<
  typeof dataHookDefinitionEnvelopeSchema
>["data"];

const dataHooksCatalogEnvelopeSchema = z.object({
  kind: z.literal(DATA_HOOKS_CATALOG_JSON_KIND),
  version: z.literal(DATA_HOOK_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  dataHooks: z.array(portableDataHookDefinitionSchema).min(1),
});

export { dataHooksCatalogEnvelopeSchema };

export type DataHooksCatalogEnvelope = z.infer<
  typeof dataHooksCatalogEnvelopeSchema
>;

export interface DataHooksCatalogReplacePlan {
  readonly toCreate: readonly CreateDataHookInput[];
  readonly toUpdate: readonly {
    readonly existing: DataHookDefinition;
    readonly input: CreateDataHookInput;
  }[];
  readonly toDelete: readonly DataHookDefinition[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

export function catalogHookKey(hook: {
  readonly entity: string;
  readonly name: string;
}): string {
  return `${hook.entity}\0${hook.name}`;
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly DataHookDefinitionJsonError[] {
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
      errors: [{ path: "(root)", message: "Invalid JSON." }],
    };
  }
}

function validateCatalogCrossReferences(
  hooks: readonly CreateDataHookInput[],
): readonly DataHookDefinitionJsonError[] {
  const errors: DataHookDefinitionJsonError[] = [];
  const keyCounts = new Map<string, number>();

  for (const hook of hooks) {
    const key = catalogHookKey(hook);
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  for (const [key, count] of keyCounts) {
    if (count > 1) {
      const [entity, name] = key.split("\0");
      errors.push({
        path: "dataHooks",
        message: `Duplicate hook "${name}" for entity "${entity}".`,
      });
    }
  }

  return errors;
}

export function toPortableDataHookDefinition(
  record: DataHookDefinition,
): PortableDataHookDefinition {
  const {
    id: _id,
    tenantId: _tenantId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    name,
    description,
    entity,
    phase,
    trigger,
    condition,
    actions,
    enabled,
    order,
    chainHooks,
    execution,
  } = record;
  void _id;
  void _tenantId;
  void _createdAt;
  void _updatedAt;

  return portableDataHookDefinitionSchema.parse({
    name,
    ...(description !== undefined ? { description } : {}),
    entity,
    phase,
    trigger,
    ...(condition !== undefined ? { condition } : {}),
    actions,
    enabled,
    order,
    ...(chainHooks !== undefined ? { chainHooks } : {}),
    ...(execution !== undefined ? { execution } : {}),
  });
}

export function createDataHookDefinitionEnvelope(
  data: DataHookDefinitionFormData,
): {
  readonly kind: typeof DATA_HOOK_DEFINITION_JSON_KIND;
  readonly version: typeof DATA_HOOK_DEFINITION_JSON_VERSION;
  readonly data: DataHookDefinitionFormData;
} {
  return {
    kind: DATA_HOOK_DEFINITION_JSON_KIND,
    version: DATA_HOOK_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createDataHooksCatalogEnvelope(
  definitions: readonly DataHookDefinition[],
  options?: { readonly exportedAt?: string },
): DataHooksCatalogEnvelope {
  return {
    kind: DATA_HOOKS_CATALOG_JSON_KIND,
    version: DATA_HOOK_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    dataHooks: definitions.map(toPortableDataHookDefinition),
  };
}

export function parseDataHookDefinitionJson(
  text: string,
): JsonImportResult<DataHookDefinitionFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = dataHookDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function validateDataHookDefinitionImport(
  text: string,
): JsonImportResult<DataHookDefinitionFormData> {
  return parseDataHookDefinitionJson(text);
}

export function parseDataHooksCatalogJson(
  text: string,
): JsonImportResult<DataHooksCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = dataHooksCatalogEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(result.data.dataHooks);
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateDataHooksCatalogImport(
  text: string,
): JsonImportResult<DataHooksCatalogEnvelope> {
  return parseDataHooksCatalogJson(text);
}

export function validateDataHooksCatalogEnvelope(
  input: unknown,
): JsonImportResult<DataHooksCatalogEnvelope> {
  const result = dataHooksCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(result.data.dataHooks);
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeDataHooksCatalogReplacePlan(input: {
  readonly existing: readonly DataHookDefinition[];
  readonly imported: readonly CreateDataHookInput[];
}): DataHooksCatalogReplacePlan {
  const existingByKey = new Map(
    input.existing.map((record) => [catalogHookKey(record), record]),
  );
  const importedByKey = new Map(
    input.imported.map((record) => [catalogHookKey(record), record]),
  );

  const toCreate: CreateDataHookInput[] = [];
  const toUpdate: DataHooksCatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: DataHookDefinition[] = [];

  for (const imported of input.imported) {
    const existing = existingByKey.get(catalogHookKey(imported));
    if (existing) {
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  for (const existing of input.existing) {
    if (!importedByKey.has(catalogHookKey(existing))) {
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
