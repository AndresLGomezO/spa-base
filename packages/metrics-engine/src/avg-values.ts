import { avgKeyForField, countKeyForField } from "./metric-doc-id.js";

export function computeAvgFieldsFromValues(
  values: Record<string, number>,
): Record<string, number> {
  const avgFields: Record<string, number> = {};

  for (const key of Object.keys(values)) {
    if (!key.startsWith("sum_")) {
      continue;
    }

    const fieldSuffix = key.slice("sum_".length);
    const countKey = countKeyForField(fieldSuffix);
    const sum = values[key] ?? 0;
    const count = values[countKey] ?? 0;
    avgFields[avgKeyForField(fieldSuffix)] = count > 0 ? sum / count : 0;
  }

  return avgFields;
}

export function mergeAvgFieldsIntoValues(
  values: Record<string, number>,
): Record<string, number> {
  return {
    ...values,
    ...computeAvgFieldsFromValues(values),
  };
}
