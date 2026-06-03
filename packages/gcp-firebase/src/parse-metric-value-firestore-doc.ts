import {
  metricValueRecordSchema,
  mergeAvgFieldsIntoValues,
  type MetricValueRecord,
} from "@repo/metrics-engine";

const VALUES_FIELD_PREFIX = "values.";

function coerceNumericRecord(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

/**
 * Firestore increment writes use dotted keys (`values.sum_amount`) which may
 * not appear under a nested `values` map when reading snapshot.data().
 */
function extractValuesFromFirestoreData(
  data: Record<string, unknown>,
): Record<string, number> {
  const nested = coerceNumericRecord(data.values);
  if (Object.keys(nested).length > 0) {
    return nested;
  }

  const flattened: Record<string, number> = {};
  for (const [key, raw] of Object.entries(data)) {
    if (!key.startsWith(VALUES_FIELD_PREFIX)) {
      continue;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      continue;
    }
    flattened[key.slice(VALUES_FIELD_PREFIX.length)] = raw;
  }

  return flattened;
}

function coerceObjectRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

/**
 * Normalizes raw Firestore metric row data before Zod validation.
 * Firestore merge + dotted increment paths can leave documents without a top-level `values` map.
 */
export function parseMetricValueFirestoreDoc(
  docId: string,
  data: Record<string, unknown> | undefined,
  fallbackValues?: Record<string, number>,
): MetricValueRecord | null {
  if (!data) {
    return null;
  }

  const rawValues = extractValuesFromFirestoreData(data);
  const valuesBase =
    Object.keys(rawValues).length > 0 ? rawValues : (fallbackValues ?? {});

  const parsed = metricValueRecordSchema.safeParse({
    id:
      typeof data.id === "string" && data.id.trim().length > 0
        ? data.id
        : docId,
    tenantId: data.tenantId,
    metricName: data.metricName,
    userId: data.userId,
    group: coerceObjectRecord(data.group),
    dimensions: coerceObjectRecord(data.dimensions),
    values: mergeAvgFieldsIntoValues(valuesBase),
    updatedAt: data.updatedAt,
  });

  return parsed.success ? parsed.data : null;
}
