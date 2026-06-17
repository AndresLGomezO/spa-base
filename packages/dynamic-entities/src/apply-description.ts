export function applyDescription<T extends { readonly description?: string }>(
  record: T,
  description: string | null | undefined,
): T {
  if (description === undefined) {
    return record;
  }
  if (description === null) {
    const { description: _removed, ...rest } = record;
    void _removed;
    return rest as T;
  }
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    const { description: _removed, ...rest } = record;
    void _removed;
    return rest as T;
  }
  return { ...record, description: trimmed };
}
