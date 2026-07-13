import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { uiBuilderPresetRecordSchema } from "@repo/entities";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";

import { parseRatesUiBuilderPresetsCatalog } from "./seed-rates-ui-builder-presets.js";

const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
  "rates-ui-builder-presets.json",
);

describe("rates UI builder presets catalog", () => {
  it("parses catalog with inline templateJson and builds valid preset records", () => {
    const catalog = parseRatesUiBuilderPresetsCatalog(
      readFileSync(catalogPath, "utf8"),
    );

    expect(catalog.presets).toHaveLength(5);
    expect(catalog.presets[0]).toMatchObject({
      id: "rates-compact-metric-card",
      templateJson: expect.any(String),
    });
    expect(catalog.presets[0]).not.toHaveProperty("compactMetricCard");

    for (const preset of catalog.presets) {
      expect(() =>
        uiLayoutDocumentSchema.parse(JSON.parse(preset.templateJson)),
      ).not.toThrow();

      const record = uiBuilderPresetRecordSchema.parse({
        id: preset.id,
        name: preset.name,
        kind: preset.kind,
        presetCategory: preset.presetCategory,
        designSurface: preset.designSurface,
        sourceEntityName: preset.sourceEntityName,
        templateJson: preset.templateJson,
        fieldSlots: [],
        updatedAt: new Date().toISOString(),
      });
      expect(record.designSurface).toBe("metricWidget");
    }
  });
});
