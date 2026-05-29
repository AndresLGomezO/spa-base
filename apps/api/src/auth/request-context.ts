export interface RequestContext {
  readonly uid: string;
  readonly tenantId: string;
  readonly claims: Record<string, unknown>;
}
