import { isApiClientError } from "./api-client";
import { auth } from "./firebase";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTenantNotResolvedError(error: unknown): boolean {
  return isApiClientError(error) && error.code === "TENANT_NOT_RESOLVED";
}

export async function fetchWithTenantNotResolvedRetry<T>(
  fetchFn: () => Promise<T>,
): Promise<T> {
  try {
    return await fetchFn();
  } catch (error) {
    if (!isTenantNotResolvedError(error)) {
      throw error;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw error;
    }

    await currentUser.getIdToken(true);
    await sleep(300);
    return fetchFn();
  }
}
