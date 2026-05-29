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
import type { AuthContextValue, LoginResult } from "./auth.types";
import { syncAuthSession } from "../lib/auth-session";
import {
  GoogleAuthProvider,
  auth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
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

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        if (!firebaseUser) {
          syncedUidRef.current = null;
          syncInFlightRef.current = false;
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
        if (!cancelled) {
          dispatch({ type: "LOGIN_STARTED" });
        }

        const syncResult = await syncAuthSession(firebaseUser);
        syncInFlightRef.current = false;

        if (cancelled) return;

        if (!syncResult.ok) {
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
        dispatch({
          type: "AUTH_STATE_AUTHENTICATED",
          user: await buildAuthUser(firebaseUser, syncResult.user?.role),
        });
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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

  const value: AuthContextValue = useMemo(
    () => ({
      user: state.user,
      error: state.error,
      isAuthenticated: state.phase === "authenticated",
      isReady:
        state.phase === "authenticated" || state.phase === "unauthenticated",
      loginWithGoogle,
      logout,
    }),
    [loginWithGoogle, logout, state.error, state.phase, state.user],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
