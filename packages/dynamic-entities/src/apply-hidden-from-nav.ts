export function applyHiddenFromNav<
  T extends { readonly hiddenFromNav?: boolean },
>(record: T, hiddenFromNav: boolean | undefined): T {
  if (hiddenFromNav === undefined) {
    return record;
  }
  if (hiddenFromNav) {
    return { ...record, hiddenFromNav: true };
  }
  const { hiddenFromNav: _removed, ...rest } = record;
  void _removed;
  return rest as T;
}
