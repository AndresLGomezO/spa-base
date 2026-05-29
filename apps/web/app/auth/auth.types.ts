/**
 * Keep auth types local while they are web-app specific.
 * If another app/package consumes these contracts, promote them to a shared
 * package (for example packages/shared-types) and import from there.
 */
export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly role: string | null;
  readonly providerId: string | null;
}

export interface TenantOption {
  readonly id: string;
  readonly name: string;
}

export interface AuthState {
  readonly phase:
    | "initializing"
    | "authenticating"
    | "authenticated"
    | "unauthenticated";
  readonly user: AuthUser | null;
  readonly error: string | null;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantId: string | null;
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
}

export interface LoginResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface SelectTenantResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly isAuthenticated: boolean;
  readonly isReady: boolean;
  readonly error: string | null;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantId: string | null;
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
  readonly loginWithGoogle: () => Promise<LoginResult>;
  readonly logout: () => Promise<void>;
  readonly selectTenant: (tenantId: string) => Promise<SelectTenantResult>;
}
