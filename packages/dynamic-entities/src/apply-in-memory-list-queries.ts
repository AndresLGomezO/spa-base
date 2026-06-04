export function applyInMemoryListQueries<
  T extends Record<string, unknown> & {
    readonly inMemoryListQueries?: boolean;
  },
>(record: T, inMemoryListQueries: boolean | undefined): T {
  if (inMemoryListQueries === undefined) {
    return record;
  }
  if (inMemoryListQueries) {
    return { ...record, inMemoryListQueries: true };
  }
  const { inMemoryListQueries: _removed, ...rest } = record;
  void _removed;
  return rest as T;
}
