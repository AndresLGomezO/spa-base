import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FORMULA_DEFINITIONS_CATALOG_JSON_KIND,
  FORMULA_DEFINITION_JSON_VERSION,
} from "./formula-definition-json.js";
import { buildRatesFormulaDefinitions } from "./rates-formula-catalog.js";
import type { PortableFormulaDefinition } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const ratesCatalogPath = resolve(
  here,
  "../../../apps/api/src/admin/rates-tenant/catalogs/rates-formula-definitions.json",
);

const UTILITY_NAMES = new Set(["monthlyRateFromQuote", "scheduleAnchorDate"]);

function loadUtilityFormulas(): readonly PortableFormulaDefinition[] {
  if (!existsSync(ratesCatalogPath)) {
    throw new Error(
      `Missing ${ratesCatalogPath}. Seed utilities before regenerating.`,
    );
  }

  const document = JSON.parse(readFileSync(ratesCatalogPath, "utf8")) as {
    readonly formulaDefinitions: readonly PortableFormulaDefinition[];
  };

  const utilities = document.formulaDefinitions.filter((formula) =>
    UTILITY_NAMES.has(formula.name),
  );
  if (utilities.length !== UTILITY_NAMES.size) {
    throw new Error(
      `Expected ${UTILITY_NAMES.size} utility formulas in rates catalog.`,
    );
  }

  return utilities.map((formula) => ({
    ...formula,
    source: "tenant" as const,
  }));
}

function main() {
  const formulaDefinitions = buildRatesFormulaDefinitions(
    loadUtilityFormulas(),
  );

  writeFileSync(
    ratesCatalogPath,
    `${JSON.stringify(
      {
        kind: FORMULA_DEFINITIONS_CATALOG_JSON_KIND,
        version: FORMULA_DEFINITION_JSON_VERSION,
        exportedAt: new Date().toISOString(),
        formulaDefinitions,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    `Wrote ${formulaDefinitions.length} tenant formulas to ${ratesCatalogPath}`,
  );
}

main();
