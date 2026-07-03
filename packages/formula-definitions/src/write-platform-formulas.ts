import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildMathFormulas } from "./platform-formula-catalog.js";
import type { PortableFormulaDefinition } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const platformFormulasPath = resolve(here, "platform-formulas.json");

function main() {
  const formulaDefinitions = buildMathFormulas();

  writeFileSync(
    platformFormulasPath,
    `${JSON.stringify({ formulaDefinitions }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Wrote ${formulaDefinitions.length} math platform formulas to ${platformFormulasPath}`,
  );
}

main();
