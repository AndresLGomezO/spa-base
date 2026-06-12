import type { User } from "../lib/firebase";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForTenantJwtClaim(
  firebaseUser: User,
  tenantId: string,
  options?: { readonly maxAttempts?: number; readonly delayMs?: number },
): Promise<void> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delayMs = options?.delayMs ?? 300;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await firebaseUser.getIdToken(true);
    const tokenResult = await firebaseUser.getIdTokenResult();
    const claim = tokenResult.claims.tenantId;
    if (typeof claim === "string" && claim.trim() === tenantId) {
      return;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }
}
