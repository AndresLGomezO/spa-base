export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sorted[key] = sortValue(record[key]);
  }
  return sorted;
}
