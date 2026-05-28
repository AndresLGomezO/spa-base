import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import { AuthContext } from "./AuthContext";
import {
  AUTH_INITIAL_STATE,
  authReducer,
  mapFirebaseUser,
} from "./auth.machine";
import type { AuthContextValue, LoginResult } from "./auth.types";
import {
  GoogleAuthProvider,
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Next iteration: enrich this session with backend /auth/me profile hydration.
      if (firebaseUser) {
        dispatch({
          type: "AUTH_STATE_AUTHENTICATED",
          user: mapFirebaseUser(firebaseUser),
        });
        return;
      }

      dispatch({ type: "AUTH_STATE_UNAUTHENTICATED" });
    });

    return unsubscribe;
  }, []);

  const loginWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      dispatch({ type: "LOGIN_STARTED" });

      try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
      } catch (error) {
        const message = mapAuthError(error);
        dispatch({ type: "LOGIN_FAILED", error: message });
        return { success: false, error: message };
      }
    },
    [],
  );

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
      isReady: state.phase !== "initializing",
      loginWithEmailPassword,
      loginWithGoogle,
      logout,
    }),
    [
      loginWithEmailPassword,
      loginWithGoogle,
      logout,
      state.error,
      state.phase,
      state.user,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
