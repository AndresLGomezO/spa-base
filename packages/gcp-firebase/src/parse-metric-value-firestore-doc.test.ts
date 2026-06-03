import { describe, expect, it } from "vitest";

import { parseMetricValueFirestoreDoc } from "./parse-metric-value-firestore-doc.js";

describe("parseMetricValueFirestoreDoc", () => {
  it("defaults missing values to an empty record", () => {
    const record = parseMetricValueFirestoreDoc("doc_1", {
      id: "doc_1",
      tenantId: "rates",
      metricName: "metric_SdFTCjYYA1FQ",
      userId: "user_1",
      group: {},
      dimensions: {},
      updatedAt: "2026-06-02T12:00:00.000Z",
    });

    expect(record).toMatchObject({
      id: "doc_1",
      values: {},
    });
  });

  it("uses fallback increments when Firestore values map is absent", () => {
    const record = parseMetricValueFirestoreDoc(
      "doc_1",
      {
        id: "doc_1",
        tenantId: "rates",
        metricName: "metric_SdFTCjYYA1FQ",
        userId: "user_1",
        group: {},
        dimensions: {},
        updatedAt: "2026-06-02T12:00:00.000Z",
      },
      { sum_amount: 120 },
    );

    expect(record?.values.sum_amount).toBe(120);
  });

  it("reads values from dotted Firestore increment fields", () => {
    const record = parseMetricValueFirestoreDoc("doc_1", {
      id: "doc_1",
      tenantId: "rates",
      metricName: "metric_AJ8ymnSHdxBv",
      userId: "rates_testuser1",
      group: {},
      dimensions: {},
      "values.sum_amount": 100_408_800,
      "values.avg_amount": 0,
      updatedAt: "2026-06-02T21:49:25.119Z",
    });

    expect(record?.values.sum_amount).toBe(100_408_800);
    expect(record?.values.avg_amount).toBe(0);
  });

  it("parses numeric values from Firestore", () => {
    const record = parseMetricValueFirestoreDoc("doc_1", {
      id: "doc_1",
      tenantId: "rates",
      metricName: "metric_SdFTCjYYA1FQ",
      userId: "user_1",
      group: { month: "2026-06" },
      dimensions: {},
      values: { sum_amount: 400, ignored: "x" },
      updatedAt: "2026-06-02T12:00:00.000Z",
    });

    expect(record?.values.sum_amount).toBe(400);
  });
});
