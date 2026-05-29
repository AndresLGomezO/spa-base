import type { AuthState, AuthUser, TenantOption } from "./auth.types";
import type { User } from "../lib/firebase";

export const AUTH_INITIAL_STATE: AuthState = {
  phase: "initializing",
  user: null,
  error: null,
  permissions: [],
  isSuperAdmin: false,
  tenantId: null,
  availableTenants: [],
  tenantOptions: [],
};

type AuthAction =
  | { readonly type: "LOGIN_STARTED" }
  | {
      readonly type: "AUTH_STATE_AUTHENTICATED";
      readonly user: AuthUser;
      readonly permissions?: readonly string[];
      readonly isSuperAdmin?: boolean;
      readonly tenantId?: string | null;
      readonly availableTenants?: readonly string[];
      readonly tenantOptions?: readonly TenantOption[];
    }
  | {
      readonly type: "TENANT_SELECTED";
      readonly tenantId: string;
      readonly availableTenants: readonly string[];
      readonly tenantOptions: readonly TenantOption[];
      readonly permissions: readonly string[];
      readonly isSuperAdmin: boolean;
    }
  | { readonly type: "AUTH_STATE_UNAUTHENTICATED" }
  | { readonly type: "LOGIN_FAILED"; readonly error: string }
  | { readonly type: "LOGOUT_COMPLETED" };

function mapFirebaseUser(user: User): AuthUser {
  const provider = user.providerData[0]?.providerId ?? null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: "member",
    providerId: provider,
  };
}

export async function buildAuthUser(user: User): Promise<AuthUser> {
  const base = mapFirebaseUser(user);

  try {
    const tokenResult = await user.getIdTokenResult();
    const claimRole = tokenResult.claims.role;
    const role =
      typeof claimRole === "string" && claimRole.length > 0
        ? claimRole
        : base.role;

    return { ...base, role };
  } catch {
    return base;
  }
}

function clearSessionFields(): Pick<
  AuthState,
  | "permissions"
  | "isSuperAdmin"
  | "tenantId"
  | "availableTenants"
  | "tenantOptions"
> {
  return {
    permissions: [],
    isSuperAdmin: false,
    tenantId: null,
    availableTenants: [],
    tenantOptions: [],
  };
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_STARTED":
      return {
        phase: "authenticating",
        user: null,
        error: null,
        ...clearSessionFields(),
      };
    case "AUTH_STATE_AUTHENTICATED":
      return {
        phase: "authenticated",
        user: action.user,
        error: null,
        permissions: action.permissions ?? state.permissions,
        isSuperAdmin: action.isSuperAdmin ?? state.isSuperAdmin,
        tenantId: action.tenantId ?? state.tenantId,
        availableTenants: action.availableTenants ?? state.availableTenants,
        tenantOptions: action.tenantOptions ?? state.tenantOptions,
      };
    case "TENANT_SELECTED":
      return {
        ...state,
        phase: "authenticated",
        error: null,
        tenantId: action.tenantId,
        availableTenants: action.availableTenants,
        tenantOptions: action.tenantOptions,
        permissions: action.permissions,
        isSuperAdmin: action.isSuperAdmin,
      };
    case "AUTH_STATE_UNAUTHENTICATED":
      return {
        phase: "unauthenticated",
        user: null,
        error: null,
        ...clearSessionFields(),
      };
    case "LOGIN_FAILED":
      return {
        phase: "unauthenticated",
        user: null,
        error: action.error,
        ...clearSessionFields(),
      };
    case "LOGOUT_COMPLETED":
      return {
        phase: "unauthenticated",
        user: null,
        error: null,
        ...clearSessionFields(),
      };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}
