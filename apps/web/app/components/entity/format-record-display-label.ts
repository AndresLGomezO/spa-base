export function formatRecordDisplayLabel(
  record: Record<string, unknown>,
): string {
  for (const key of ["name", "title", "label"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return String(record.id);
}
