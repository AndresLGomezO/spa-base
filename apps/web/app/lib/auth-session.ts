import type { User } from "./firebase";
import { getAppCheckHeaderValue } from "./app-check";
import { appConfig } from "../config/app-config";

interface SyncedAuthUser {
  readonly uid: string;
  readonly email: string | null;
}

interface SyncAuthSessionResult {
  readonly ok: boolean;
  readonly user?: SyncedAuthUser;
  readonly error?: string;
}

interface AuthValidateSuccessResponse {
  readonly ok: true;
  readonly user: SyncedAuthUser;
}

interface AuthValidateErrorResponse {
  readonly ok: false;
  readonly message?: string;
}

export async function syncAuthSession(
  firebaseUser: User,
): Promise<SyncAuthSessionResult> {
  try {
    const [idToken, appCheckToken] = await Promise.all([
      firebaseUser.getIdToken(),
      getAppCheckHeaderValue(),
    ]);

    const response = await fetch(
      new URL("/auth/validate", appConfig.apiBaseUrl),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "X-Firebase-AppCheck": appCheckToken,
        },
      },
    );

    const payload = (await response.json()) as
      | AuthValidateSuccessResponse
      | AuthValidateErrorResponse;

    if (!response.ok || !payload.ok) {
      const message =
        "message" in payload && payload.message
          ? payload.message
          : "Session validation failed.";
      return { ok: false, error: message };
    }

    return {
      ok: true,
      user: {
        uid: payload.user.uid,
        email: payload.user.email,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to register session with the server.";
    return { ok: false, error: message };
  }
}
