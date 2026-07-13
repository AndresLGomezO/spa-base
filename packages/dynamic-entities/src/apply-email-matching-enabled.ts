export function applyEmailMatchingEnabled<
  T extends { readonly emailMatchingEnabled?: boolean },
>(record: T, emailMatchingEnabled: boolean | undefined): T {
  if (emailMatchingEnabled === undefined) {
    return record;
  }
  if (emailMatchingEnabled) {
    return { ...record, emailMatchingEnabled: true };
  }
  const { emailMatchingEnabled: _removed, ...rest } = record;
  void _removed;
  return rest as T;
}
