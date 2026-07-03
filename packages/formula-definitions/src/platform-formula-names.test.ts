import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PLATFORM_FORMULA_NAMES } from "./platform-formula-names.js";

describe("platform-formula-names", () => {
  it("matches names in platform-formulas.json", () => {
    const jsonPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "platform-formulas.json",
    );
    const document = JSON.parse(readFileSync(jsonPath, "utf8")) as {
      readonly formulaDefinitions: readonly { readonly name: string }[];
    };

    expect([...PLATFORM_FORMULA_NAMES]).toEqual(
      document.formulaDefinitions.map((formula) => formula.name),
    );
  });
});
