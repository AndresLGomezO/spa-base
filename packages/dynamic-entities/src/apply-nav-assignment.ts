export function applyNavCategoryId<
  T extends { readonly navCategoryId?: string },
>(record: T, navCategoryId: string | null | undefined): T {
  if (navCategoryId === undefined) {
    return record;
  }
  if (navCategoryId === null) {
    const { navCategoryId: _removed, ...rest } = record;
    void _removed;
    return rest as T;
  }
  const trimmed = navCategoryId.trim();
  if (trimmed.length === 0) {
    const { navCategoryId: _removed, ...rest } = record;
    void _removed;
    return rest as T;
  }
  return { ...record, navCategoryId: trimmed };
}

export function applyNavOrder<T extends { readonly navOrder?: number }>(
  record: T,
  navOrder: number | null | undefined,
): T {
  if (navOrder === undefined) {
    return record;
  }
  if (navOrder === null) {
    const { navOrder: _removed, ...rest } = record;
    void _removed;
    return rest as T;
  }
  return { ...record, navOrder };
}
