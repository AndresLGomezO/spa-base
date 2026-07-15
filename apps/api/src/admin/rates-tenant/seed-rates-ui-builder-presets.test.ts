import { describe, expect, it } from "vitest";

import { uiBuilderPresetRecordSchema } from "@repo/entities";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";

import { loadUiBuilderPresetsCatalogJson } from "./seed-catalog-dir.js";
import { parseRatesUiBuilderPresetsCatalog } from "./seed-rates-ui-builder-presets.js";

describe("rates UI builder presets catalog", () => {
  it("parses catalog with inline templateJson and builds valid preset records", () => {
    const catalog = parseRatesUiBuilderPresetsCatalog(
      loadUiBuilderPresetsCatalogJson(),
    );

    expect(catalog.presets).toHaveLength(5);
    const compactMetricCard = catalog.presets.find(
      (preset) => preset.id === "rates-compact-metric-card",
    );
    expect(compactMetricCard).toMatchObject({
      id: "rates-compact-metric-card",
      templateJson: expect.any(String),
    });
    expect(compactMetricCard).not.toHaveProperty("compactMetricCard");

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
