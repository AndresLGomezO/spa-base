export interface RequestContext {
  readonly uid: string;
  readonly tenantId: string;
  readonly claims: Record<string, unknown>;
  readonly permissions?: readonly string[];
  readonly isSuperAdmin?: boolean;
}
