import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FORMULA_DEFINITION_JSON_KIND,
  FORMULA_DEFINITION_JSON_VERSION,
} from "./formula-definition-json.js";
import { buildRatesFormulaDefinitions } from "./rates-formula-catalog.js";
import type { PortableFormulaDefinition } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const formulasDir = resolve(
  here,
  "../../../apps/api/src/admin/rates-tenant/catalogs/formula-definitions",
);

const UTILITY_NAMES = new Set(["monthlyRateFromQuote", "scheduleAnchorDate"]);

function kebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function loadUtilityFormulas(): readonly PortableFormulaDefinition[] {
  if (!existsSync(formulasDir)) {
    throw new Error(
      `Missing ${formulasDir}. Seed utilities before regenerating.`,
    );
  }

  const formulas = readdirSync(formulasDir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((fileName) => {
      const parsed = JSON.parse(
        readFileSync(join(formulasDir, fileName), "utf8"),
      ) as { data: PortableFormulaDefinition };
      return parsed.data;
    });

  const utilities = formulas.filter((formula) => UTILITY_NAMES.has(formula.name));
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
  mkdirSync(formulasDir, { recursive: true });
  const formulaDefinitions = buildRatesFormulaDefinitions(
    loadUtilityFormulas(),
  );

  for (const formula of formulaDefinitions) {
    const filePath = join(formulasDir, `${kebabCase(formula.name)}.json`);
    writeFileSync(
      filePath,
      `${JSON.stringify(
        {
          kind: FORMULA_DEFINITION_JSON_KIND,
          version: FORMULA_DEFINITION_JSON_VERSION,
          data: formula,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  console.log(
    `Wrote ${formulaDefinitions.length} tenant formulas to ${formulasDir}`,
  );
}

main();
