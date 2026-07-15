import { describe, expect, it } from "vitest";

import { parseMetricDefinitionsCatalogJson } from "@repo/metrics-engine";

import { loadMetricDefinitionsCatalogJson } from "../admin/rates-tenant/seed-catalog-dir.js";

describe("rates metric catalog", () => {
  it("defines Payment Progress % with metricRef inputs for fast evaluate", () => {
    const parsed = parseMetricDefinitionsCatalogJson(
      loadMetricDefinitionsCatalogJson(),
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

    if (
      paymentProgress.computation.numerator.type !== "metricRef" ||
      paymentProgress.computation.denominator.type !== "metricRef"
    ) {
      return;
    }

    expect(paymentProgress.computation.numerator.metricDefinitionId).toBe(
      "Paid Amount by Due Month",
    );
    expect(paymentProgress.computation.denominator.metricDefinitionId).toBe(
      "Scheduled Amount by Due Month",
    );
  });
});
