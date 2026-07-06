import { describe, expect, it } from "vitest";

import { parseMetricDefinitionsCatalogJson } from "@repo/metrics-engine";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CATALOG_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../admin/rates-tenant/catalogs/rates-metric-definitions.json",
);

describe("rates metric catalog", () => {
  it("defines Payment Progress % with metricRef inputs for fast evaluate", () => {
    const parsed = parseMetricDefinitionsCatalogJson(
      readFileSync(CATALOG_PATH, "utf8"),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const paymentProgress = parsed.data.metricDefinitions.find(
      (metric) => metric.name === "Payment Progress %",
    );
    expect(paymentProgress?.computationMode).toBe("computed");
    expect(paymentProgress?.computation?.type).toBe("ratio");

    if (paymentProgress?.computation?.type !== "ratio") {
      return;
    }

    expect(paymentProgress.computation.numerator.type).toBe("metricRef");
    expect(paymentProgress.computation.denominator.type).toBe("metricRef");
    expect(paymentProgress.computation.numerator.metricDefinitionId).toBe(
      "Paid Amount by Due Month",
    );
    expect(paymentProgress.computation.denominator.metricDefinitionId).toBe(
      "Scheduled Amount by Due Month",
    );
  });
});
