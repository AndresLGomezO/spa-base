export function applyTenantWideRead<
  T extends { readonly tenantWideRead?: boolean },
>(record: T, tenantWideRead: boolean | undefined): T {
  if (tenantWideRead === undefined) {
    return record;
  }
  if (tenantWideRead) {
    return { ...record, tenantWideRead: true };
  }
  const { tenantWideRead: _removed, ...rest } = record;
  void _removed;
  return rest as T;
}
