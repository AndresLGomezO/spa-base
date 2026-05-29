import type { AuthState, AuthUser } from "./auth.types";
import type { User } from "../lib/firebase";

export const AUTH_INITIAL_STATE: AuthState = {
  phase: "initializing",
  user: null,
  error: null,
  permissions: [],
  isSuperAdmin: false,
};

type AuthAction =
  | { readonly type: "LOGIN_STARTED" }
  | {
      readonly type: "AUTH_STATE_AUTHENTICATED";
      readonly user: AuthUser;
      readonly permissions?: readonly string[];
      readonly isSuperAdmin?: boolean;
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

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_STARTED":
      return {
        phase: "authenticating",
        user: null,
        error: null,
        permissions: [],
        isSuperAdmin: false,
      };
    case "AUTH_STATE_AUTHENTICATED":
      return {
        phase: "authenticated",
        user: action.user,
        error: null,
        permissions: action.permissions ?? state.permissions,
        isSuperAdmin: action.isSuperAdmin ?? state.isSuperAdmin,
      };
    case "AUTH_STATE_UNAUTHENTICATED":
      return {
        phase: "unauthenticated",
        user: null,
        error: null,
        permissions: [],
        isSuperAdmin: false,
      };
    case "LOGIN_FAILED":
      return {
        phase: "unauthenticated",
        user: null,
        error: action.error,
        permissions: [],
        isSuperAdmin: false,
      };
    case "LOGOUT_COMPLETED":
      return {
        phase: "unauthenticated",
        user: null,
        error: null,
        permissions: [],
        isSuperAdmin: false,
      };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}
