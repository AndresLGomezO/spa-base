export function normalizeMetricFieldKey(field: string): string {
  return field.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function sumKeyForField(field: string): string {
  return `sum_${normalizeMetricFieldKey(field)}`;
}

export function countKeyForField(field: string): string {
  return `count_${normalizeMetricFieldKey(field)}`;
}

export function avgKeyForField(field: string): string {
  return `avg_${normalizeMetricFieldKey(field)}`;
}

export function valueKeyForAggregation(
  operation: "SUM" | "COUNT" | "AVG",
  field?: string,
): readonly string[] {
  switch (operation) {
    case "SUM": {
      return [sumKeyForField(field ?? "")];
    }
    case "COUNT":
      if (!field) {
        return ["count"];
      }
      return [countKeyForField(field)];
    case "AVG": {
      const normalizedField = normalizeMetricFieldKey(field ?? "");
      return [
        sumKeyForField(normalizedField),
        countKeyForField(normalizedField),
      ];
    }
    default:
      return [];
  }
}
