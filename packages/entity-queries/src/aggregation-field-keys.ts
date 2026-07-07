export function normalizeAggregationFieldKey(field: string): string {
  return field.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function sumKeyForField(field: string): string {
  return `sum_${normalizeAggregationFieldKey(field)}`;
}

export function countKeyForField(field: string): string {
  return `count_${normalizeAggregationFieldKey(field)}`;
}

export function avgKeyForField(field: string): string {
  return `avg_${normalizeAggregationFieldKey(field)}`;
}

export function outputKeyForAggregation(
  operation: "SUM" | "COUNT" | "AVG",
  field?: string,
): string {
  switch (operation) {
    case "SUM":
      return sumKeyForField(field ?? "");
    case "COUNT":
      return field ? countKeyForField(field) : "count";
    case "AVG":
      return avgKeyForField(field ?? "");
  }
}

export function internalKeysForAggregation(
  operation: "SUM" | "COUNT" | "AVG",
  field?: string,
): readonly string[] {
  switch (operation) {
    case "SUM":
      return [sumKeyForField(field ?? "")];
    case "COUNT":
      return field ? [countKeyForField(field)] : ["count"];
    case "AVG": {
      const normalizedField = normalizeAggregationFieldKey(field ?? "");
      return [
        sumKeyForField(normalizedField),
        countKeyForField(normalizedField),
      ];
    }
  }
}
