export function formatRecordDisplayLabel(
  record: Record<string, unknown>,
  displayField?: string,
): string {
  if (displayField) {
    const value = record[displayField];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  for (const key of ["name", "title", "label", "code"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return String(record.id);
}
