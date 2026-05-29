export function applySelectProjection(
  records: readonly Record<string, unknown>[],
  select: readonly string[] | undefined,
): Record<string, unknown>[] {
  if (!select || select.length === 0) {
    return records.map((record) => ({ ...record }));
  }

  const fields = new Set<string>(["id", ...select]);

  return records.map((record) => {
    const projected: Record<string, unknown> = {};
    for (const fieldName of fields) {
      if (fieldName in record) {
        projected[fieldName] = record[fieldName];
      }
    }
    return projected;
  });
}
