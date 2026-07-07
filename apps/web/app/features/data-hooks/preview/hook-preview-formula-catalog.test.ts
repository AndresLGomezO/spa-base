import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  getFormulaPreviewDescriptor,
  listFormulaPreviewCatalogNames,
} from "./hook-preview-formula-catalog.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../../../../../");

function loadFormulaNames(): readonly string[] {
  const platform = JSON.parse(
    readFileSync(
      join(repoRoot, "packages/formula-definitions/src/platform-formulas.json"),
      "utf8",
    ),
  ) as { formulaDefinitions: Array<{ name: string }> };
  const rates = JSON.parse(
    readFileSync(
      join(
        repoRoot,
        "apps/api/src/admin/rates-tenant/catalogs/rates-formula-definitions.json",
      ),
      "utf8",
    ),
  ) as { formulaDefinitions: Array<{ name: string }> };

  return [
    ...platform.formulaDefinitions.map((entry) => entry.name),
    ...rates.formulaDefinitions.map((entry) => entry.name),
  ];
}

function loadEnglishFormulaPreviewStrings(): Record<string, string> {
  const common = JSON.parse(
    readFileSync(
      join(repoRoot, "apps/web/app/i18n/locales/en/common.json"),
      "utf8",
    ),
  ) as {
    dataHooks: { preview: { formulas: Record<string, string> } };
  };
  return common.dataHooks.preview.formulas;
}

describe("hook-preview-formula-catalog", () => {
  it("documents every platform and rates formula", () => {
    const catalogNames = new Set(listFormulaPreviewCatalogNames());
    const formulaNames = loadFormulaNames();

    expect(catalogNames.size).toBe(formulaNames.length);
    for (const name of formulaNames) {
      expect(catalogNames.has(name), `missing descriptor for ${name}`).toBe(
        true,
      );
    }
  });

  it("maps every descriptor summary key to an English i18n string", () => {
    const i18n = loadEnglishFormulaPreviewStrings();

    for (const name of listFormulaPreviewCatalogNames()) {
      const descriptor = getFormulaPreviewDescriptor(name);
      expect(descriptor).toBeDefined();
      const summaryKey = descriptor!.summaryKey.replace(
        "dataHooks.preview.formulas.",
        "",
      );
      expect(i18n[summaryKey], `missing i18n for ${name}`).toBeTruthy();

      for (const detailKey of descriptor!.detailBulletKeys ?? []) {
        const detailSuffix = detailKey.replace(
          "dataHooks.preview.formulas.",
          "",
        );
        expect(
          i18n[detailSuffix],
          `missing i18n for ${detailKey}`,
        ).toBeTruthy();
      }
    }
  });
});
