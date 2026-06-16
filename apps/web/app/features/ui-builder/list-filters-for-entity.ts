export function listFiltersForEntity(
  entityName: string,
  pageFilters: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly string[]>> {
  const prefix = `${entityName}.`;
  const result: Record<string, readonly string[]> = {};

  for (const [key, values] of Object.entries(pageFilters)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = values;
      continue;
    }

    if (!key.includes(".") && values.length > 0) {
      result[key] = values;
    }
  }

  return result;
}
