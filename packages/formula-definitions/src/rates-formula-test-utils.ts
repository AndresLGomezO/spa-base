import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { FormulaResolver } from "@repo/hooks";

import {
  createFormulaResolver,
  parseFormulaDefinitionsCatalogJson,
  toFormulaDefinitionForEval,
  type PortableFormulaDefinition,
} from "./index.js";

const ratesFormulasDir = resolve(
  import.meta.dirname,
  "../../../apps/api/src/admin/rates-tenant/catalogs/formula-definitions",
);

function mergeSingularCatalogDir(
  dirPath: string,
  catalog: {
    readonly kind: string;
    readonly version: number;
    readonly itemsKey: string;
  },
): string {
  if (!existsSync(dirPath)) {
    throw new Error(`Catalog directory not found: ${dirPath}`);
  }
  const items = readdirSync(dirPath)
    .filter(
      (name) =>
        name.endsWith(".json") &&
        !name.startsWith("_") &&
        !name.startsWith("."),
    )
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => {
      const parsed = JSON.parse(
        readFileSync(join(dirPath, fileName), "utf8"),
      ) as { data: unknown };
      return parsed.data;
    });
  return JSON.stringify({
    kind: catalog.kind,
    version: catalog.version,
    exportedAt: new Date().toISOString(),
    [catalog.itemsKey]: items,
  });
}

export function loadRatesFormulaDefinitions(): readonly PortableFormulaDefinition[] {
  const parsed = parseFormulaDefinitionsCatalogJson(
    mergeSingularCatalogDir(ratesFormulasDir, {
      kind: "formula-definitions-catalog",
      version: 1,
      itemsKey: "formulaDefinitions",
    }),
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
