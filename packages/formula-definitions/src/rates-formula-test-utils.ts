import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { FormulaResolver } from "@repo/hooks";

import {
  createFormulaResolver,
  parseFormulaDefinitionsCatalogJson,
  toFormulaDefinitionForEval,
  type PortableFormulaDefinition,
} from "./index.js";

const ratesCatalogPath = resolve(
  import.meta.dirname,
  "../../../apps/api/src/admin/rates-tenant/catalogs/rates-formula-definitions.json",
);

export function loadRatesFormulaDefinitions(): readonly PortableFormulaDefinition[] {
  const parsed = parseFormulaDefinitionsCatalogJson(
    readFileSync(ratesCatalogPath, "utf8"),
  );
  if (!parsed.ok) {
    throw new Error(
      `Invalid rates formula catalog: ${parsed.errors.map((error) => `${error.path}: ${error.message}`).join("; ")}`,
    );
  }
  return parsed.data.formulaDefinitions;
}

export function createRatesFormulaResolver(): FormulaResolver {
  const tenantFormulas = new Map(
    loadRatesFormulaDefinitions().map((formula) => [
      formula.name,
      toFormulaDefinitionForEval(formula),
    ]),
  );
  return createFormulaResolver(tenantFormulas);
}
