import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import { AuthContext } from "./AuthContext";
import { AUTH_INITIAL_STATE, authReducer, buildAuthUser } from "./auth.machine";
import type {
  AuthContextValue,
  LoginResult,
  SelectTenantResult,
} from "./auth.types";
import { selectTenantSession, syncAuthSession } from "../lib/auth-session";
import {
  GoogleAuthProvider,
  auth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "../lib/firebase";

interface AuthProviderProps {
  readonly children: ReactNode;
}

function mapAuthError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to authenticate. Please try again.";
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, AUTH_INITIAL_STATE);
  const syncedUidRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const autoBindAttemptedRef = useRef<string | null>(null);

  const applyTenantSelection = useCallback(
    async (
      firebaseUser: User,
      tenantId: string,
    ): Promise<SelectTenantResult> => {
      const selectResult = await selectTenantSession(firebaseUser, tenantId);
      if (!selectResult.ok) {
        return {
          success: false,
          error: selectResult.error ?? "Unable to select tenant.",
        };
      }

      await firebaseUser.getIdToken(true);
      const syncResult = await syncAuthSession(firebaseUser);

      if (!syncResult.ok || !syncResult.user) {
        if (syncResult.transient) {
          return { success: true };
        }
        return {
          success: false,
          error: syncResult.error ?? "Unable to refresh session.",
        };
      }

      dispatch({
        type: "TENANT_SELECTED",
        tenantId: syncResult.user.tenantId ?? tenantId,
        availableTenants: syncResult.user.availableTenants,
        tenantOptions: syncResult.user.tenantOptions,
        permissions: syncResult.user.permissions,
        isSuperAdmin: syncResult.user.isSuperAdmin,
        tenantRoleNames: syncResult.user.tenantRoleNames,
        activeTenantName: syncResult.user.activeTenantName,
        tenantAppearance: syncResult.user.tenantAppearance,
      });

      return { success: true };
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        if (!firebaseUser) {
          syncedUidRef.current = null;
          syncInFlightRef.current = false;
          autoBindAttemptedRef.current = null;
          if (!cancelled) {
            dispatch({ type: "AUTH_STATE_UNAUTHENTICATED" });
          }
          return;
        }

        if (syncedUidRef.current === firebaseUser.uid) {
          if (!cancelled) {
            dispatch({
              type: "AUTH_STATE_AUTHENTICATED",
              user: await buildAuthUser(firebaseUser),
            });
          }
          return;
        }

        if (syncInFlightRef.current) {
          return;
        }

        syncInFlightRef.current = true;

        const authUser = await buildAuthUser(firebaseUser);
        if (!cancelled) {
          dispatch({
            type: "AUTH_STATE_AUTHENTICATED",
            user: authUser,
          });
        }

        try {
          const syncResult = await syncAuthSession(firebaseUser);

          if (cancelled) return;

          if (!syncResult.ok) {
            if (syncResult.transient) {
              syncedUidRef.current = firebaseUser.uid;
              return;
            }

            syncedUidRef.current = null;
            await signOut();
            dispatch({
              type: "LOGIN_FAILED",
              error:
                syncResult.error ??
                "Unable to register your account. Please try again.",
            });
            return;
          }

          syncedUidRef.current = firebaseUser.uid;
          const isSuperAdmin = syncResult.user?.isSuperAdmin ?? false;
          const tenantId = syncResult.user?.tenantId ?? null;
          const availableTenants = syncResult.user?.availableTenants ?? [];

          dispatch({
            type: "AUTH_STATE_AUTHENTICATED",
            user: await buildAuthUser(firebaseUser),
            permissions: syncResult.user?.permissions ?? [],
            isSuperAdmin,
            tenantId,
            availableTenants,
            tenantOptions: syncResult.user?.tenantOptions ?? [],
            tenantRoleNames: syncResult.user?.tenantRoleNames ?? [],
            activeTenantName: syncResult.user?.activeTenantName ?? null,
            tenantAppearance: syncResult.user?.tenantAppearance ?? null,
          });

          if (
            !tenantId &&
            availableTenants.length > 0 &&
            autoBindAttemptedRef.current !== firebaseUser.uid
          ) {
            autoBindAttemptedRef.current = firebaseUser.uid;
            const firstTenant = availableTenants[0];
            if (firstTenant) {
              const bindResult = await applyTenantSelection(
                firebaseUser,
                firstTenant,
              );
              if (!bindResult.success && !cancelled) {
                syncedUidRef.current = null;
                autoBindAttemptedRef.current = null;
                await signOut();
                dispatch({
                  type: "LOGIN_FAILED",
                  error:
                    bindResult.error ??
                    "Unable to assign your tenant. Please try again.",
                });
              }
            }
          }
        } finally {
          syncInFlightRef.current = false;
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applyTenantSelection]);

  const loginWithGoogle = useCallback(async (): Promise<LoginResult> => {
    dispatch({ type: "LOGIN_STARTED" });

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (error) {
      const message = mapAuthError(error);
      dispatch({ type: "LOGIN_FAILED", error: message });
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await signOut();
    dispatch({ type: "LOGOUT_COMPLETED" });
  }, []);

  const selectTenant = useCallback(
    async (tenantId: string): Promise<SelectTenantResult> => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        return { success: false, error: "Not authenticated." };
      }

      return applyTenantSelection(firebaseUser, tenantId);
    },
    [applyTenantSelection],
  );

  const value: AuthContextValue = useMemo(
    () => ({
      user: state.user,
      error: state.error,
      isAuthenticated: state.phase === "authenticated",
      isReady:
        state.phase === "authenticated" || state.phase === "unauthenticated",
      permissions: state.permissions,
      isSuperAdmin: state.isSuperAdmin,
      tenantId: state.tenantId,
      availableTenants: state.availableTenants,
      tenantOptions: state.tenantOptions,
      tenantRoleNames: state.tenantRoleNames,
      activeTenantName: state.activeTenantName,
      tenantAppearance: state.tenantAppearance,
      loginWithGoogle,
      logout,
      selectTenant,
    }),
    [
      loginWithGoogle,
      logout,
      selectTenant,
      state.availableTenants,
      state.tenantOptions,
      state.error,
      state.isSuperAdmin,
      state.permissions,
      state.phase,
      state.tenantId,
      state.tenantRoleNames,
      state.activeTenantName,
      state.tenantAppearance,
      state.user,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
