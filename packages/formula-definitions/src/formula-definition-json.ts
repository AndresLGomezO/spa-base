import { z } from "zod";

import {
  createFormulaDefinitionInputSchema,
  type CreateFormulaDefinitionInput,
  type FormulaDefinition,
  type PortableFormulaDefinition,
} from "./types.js";
import { validateFormulaCatalog } from "./validate-formula-catalog.js";
import { getPlatformFormulaNames } from "./platform-formula-names.js";

export const FORMULA_DEFINITION_JSON_VERSION = 1 as const;
export const FORMULA_DEFINITION_JSON_KIND = "formula-definition" as const;
export const FORMULA_DEFINITIONS_CATALOG_JSON_KIND =
  "formula-definitions-catalog" as const;

export interface FormulaDefinitionJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly FormulaDefinitionJsonError[];
    };

const portableFormulaDefinitionSchema =
  createFormulaDefinitionInputSchema.extend({
    source: z.enum(["platform", "tenant"]).optional(),
  });

export type FormulaDefinitionFormData = z.infer<
  typeof portableFormulaDefinitionSchema
>;

const formulaDefinitionEnvelopeSchema = z.object({
  kind: z.literal(FORMULA_DEFINITION_JSON_KIND),
  version: z.literal(FORMULA_DEFINITION_JSON_VERSION),
  data: portableFormulaDefinitionSchema,
});

const formulaDefinitionsCatalogEnvelopeSchema = z.object({
  kind: z.literal(FORMULA_DEFINITIONS_CATALOG_JSON_KIND),
  version: z.literal(FORMULA_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  formulaDefinitions: z.array(portableFormulaDefinitionSchema).min(1),
});

export type FormulaDefinitionsCatalogEnvelope = z.infer<
  typeof formulaDefinitionsCatalogEnvelopeSchema
>;

export interface FormulaCatalogReplacePlan {
  readonly toCreate: readonly CreateFormulaDefinitionInput[];
  readonly toUpdate: readonly {
    readonly existing: FormulaDefinition;
    readonly input: CreateFormulaDefinitionInput;
  }[];
  readonly toDelete: readonly FormulaDefinition[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly FormulaDefinitionJsonError[] {
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

function validateCatalogCrossReferences(
  formulas: readonly PortableFormulaDefinition[],
): readonly FormulaDefinitionJsonError[] {
  const platformNames = new Set(getPlatformFormulaNames());
  return validateFormulaCatalog(formulas, platformNames);
}

export function toPortableFormulaDefinition(
  record: FormulaDefinition,
): PortableFormulaDefinition {
  return {
    name: record.name,
    ...(record.description ? { description: record.description } : {}),
    inputs: record.inputs,
    body: record.body,
    enabled: record.enabled,
    source: record.source,
  };
}

export function createFormulaDefinitionEnvelope(
  data: FormulaDefinitionFormData,
): {
  readonly kind: typeof FORMULA_DEFINITION_JSON_KIND;
  readonly version: typeof FORMULA_DEFINITION_JSON_VERSION;
  readonly data: FormulaDefinitionFormData;
} {
  return {
    kind: FORMULA_DEFINITION_JSON_KIND,
    version: FORMULA_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createFormulaDefinitionsCatalogEnvelope(
  definitions: readonly FormulaDefinition[],
  options?: { readonly exportedAt?: string },
): FormulaDefinitionsCatalogEnvelope {
  return {
    kind: FORMULA_DEFINITIONS_CATALOG_JSON_KIND,
    version: FORMULA_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    formulaDefinitions: definitions.map(toPortableFormulaDefinition),
  };
}

export function validateFormulaDefinitionImport(
  text: string,
): JsonImportResult<FormulaDefinitionFormData> {
  return parseFormulaDefinitionJson(text);
}

export function parseFormulaDefinitionJson(
  text: string,
): JsonImportResult<FormulaDefinitionFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = formulaDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function parseFormulaDefinitionsCatalogJson(
  text: string,
): JsonImportResult<FormulaDefinitionsCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = formulaDefinitionsCatalogEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.formulaDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateFormulaDefinitionsCatalogEnvelope(
  input: unknown,
): JsonImportResult<FormulaDefinitionsCatalogEnvelope> {
  const result = formulaDefinitionsCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.formulaDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeFormulaCatalogReplacePlan(input: {
  readonly existing: readonly FormulaDefinition[];
  readonly imported: readonly CreateFormulaDefinitionInput[];
}): FormulaCatalogReplacePlan {
  const existingByName = new Map(
    input.existing.map((record) => [record.name, record]),
  );

  const toCreate: CreateFormulaDefinitionInput[] = [];
  const toUpdate: FormulaCatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: FormulaDefinition[] = [];

  for (const imported of input.imported) {
    const existing = existingByName.get(imported.name);
    if (existing) {
      if (existing.source === "platform") {
        continue;
      }
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  const importedNames = new Set(input.imported.map((record) => record.name));
  for (const existing of input.existing) {
    if (existing.source === "platform") {
      continue;
    }
    if (!importedNames.has(existing.name)) {
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

export { formulaDefinitionsCatalogEnvelopeSchema };
