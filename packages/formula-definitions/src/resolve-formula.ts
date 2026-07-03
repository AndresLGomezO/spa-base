import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { FormulaResolver } from "@repo/hooks";

import type {
  FormulaDefinition,
  FormulaDefinitionForEval,
  PortableFormulaDefinition,
} from "./types.js";
import { formulaDefinitionSchema } from "./types.js";

const platformFormulasPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "platform-formulas.json",
);

function loadPlatformFormulas(): readonly PortableFormulaDefinition[] {
  const parsed = JSON.parse(readFileSync(platformFormulasPath, "utf8")) as {
    readonly formulaDefinitions: readonly PortableFormulaDefinition[];
  };
  return parsed.formulaDefinitions;
}

const platformFormulas = loadPlatformFormulas();

const platformByName = new Map<string, PortableFormulaDefinition>(
  platformFormulas.map((formula) => [formula.name, formula]),
);

export function getPlatformFormulaDefinitions(): readonly PortableFormulaDefinition[] {
  return platformFormulas;
}

export function getPlatformFormulaNames(): readonly string[] {
  return platformFormulas.map((formula) => formula.name);
}

export function toFormulaDefinitionForEval(
  formula: Pick<PortableFormulaDefinition, "name" | "inputs" | "body">,
): FormulaDefinitionForEval {
  return {
    name: formula.name,
    inputs: formula.inputs.map((input) => ({
      name: input.name,
      ...(input.required === false ? { required: false } : {}),
    })),
    body: formula.body,
  };
}

export function resolveFormulaDefinition(
  name: string,
  tenantFormulas: ReadonlyMap<string, FormulaDefinitionForEval>,
): FormulaDefinitionForEval | undefined {
  const tenantFormula = tenantFormulas.get(name);
  if (tenantFormula) {
    return tenantFormula;
  }

  const platformFormula = platformByName.get(name);
  if (!platformFormula) {
    return undefined;
  }

  return toFormulaDefinitionForEval(platformFormula);
}

export function createFormulaResolver(
  tenantFormulas: ReadonlyMap<string, FormulaDefinitionForEval>,
): FormulaResolver {
  return {
    resolve(name: string) {
      return resolveFormulaDefinition(name, tenantFormulas);
    },
  };
}

export function createFormulaResolverFromRecords(
  records: readonly FormulaDefinition[],
): FormulaResolver {
  const tenantFormulas = new Map<string, FormulaDefinitionForEval>();
  for (const record of records) {
    if (!record.enabled) {
      continue;
    }
    tenantFormulas.set(record.name, toFormulaDefinitionForEval(record));
  }
  return createFormulaResolver(tenantFormulas);
}

export function listAvailableFormulaNames(
  tenantRecords: readonly FormulaDefinition[],
): ReadonlySet<string> {
  const names = new Set<string>(getPlatformFormulaNames());
  for (const record of tenantRecords) {
    if (record.enabled) {
      names.add(record.name);
    }
  }
  return names;
}

export function parsePlatformFormulaLibrary(): readonly FormulaDefinition[] {
  return platformFormulas.map((formula, index) =>
    formulaDefinitionSchema.parse({
      id: `platform_formula_${index}`,
      tenantId: "__platform__",
      source: "platform",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...formula,
    }),
  );
}
