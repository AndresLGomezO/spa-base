export function extractKeySlice(
  record: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const slice: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in record) {
      slice[field] = record[field];
    }
  }
  return slice;
}

export function resolveMetricOwnerId(
  record: Record<string, unknown>,
): string | null {
  const ownerId = record.ownerId;
  if (typeof ownerId !== "string") {
    return null;
  }
  const trimmed = ownerId.trim();
  return trimmed.length > 0 ? trimmed : null;
}
