import type { AppRole } from "@repo/rbac-app";

export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly role: AppRole;
  readonly providerId: string | null;
}

export interface AuthState {
  readonly phase:
    | "initializing"
    | "authenticating"
    | "authenticated"
    | "unauthenticated";
  readonly user: AuthUser | null;
  readonly error: string | null;
}

export interface LoginResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly isAuthenticated: boolean;
  readonly isReady: boolean;
  readonly error: string | null;
  readonly loginWithGoogle: () => Promise<LoginResult>;
  readonly logout: () => Promise<void>;
}
