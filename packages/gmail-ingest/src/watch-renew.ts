/** Schedule renew this many ms before Gmail watch expiration. */
export const GMAIL_WATCH_RENEW_LEAD_MS = 24 * 60 * 60 * 1000;

/** Renew early if watch expires within this window (e.g. during history sync). */
export const GMAIL_WATCH_RENEW_IF_WITHIN_MS = 48 * 60 * 60 * 1000;

/** Minimum delay before a scheduled renew runs. */
const MIN_RENEW_DELAY_MS = 60 * 60 * 1000;

export function normalizeGmailEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Parse Gmail watch `expiration` (unix ms string) or an ISO timestamp. */
export function parseGmailWatchExpirationMs(
  expiration: string | number,
): number | null {
  if (typeof expiration === "number" && Number.isFinite(expiration)) {
    return expiration;
  }
  const raw = String(expiration).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const ms = Number(raw);
    return Number.isFinite(ms) ? ms : null;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeGmailWatchRenewAt(expiration: string | number): Date {
  const expirationMs = parseGmailWatchExpirationMs(expiration);
  if (expirationMs == null) {
    return new Date(Date.now() + GMAIL_WATCH_RENEW_LEAD_MS);
  }
  const renewAt = expirationMs - GMAIL_WATCH_RENEW_LEAD_MS;
  return new Date(Math.max(renewAt, Date.now() + MIN_RENEW_DELAY_MS));
}

export function shouldRenewGmailWatchSoon(
  watchExpiration: string | null | undefined,
  withinMs: number = GMAIL_WATCH_RENEW_IF_WITHIN_MS,
): boolean {
  if (!watchExpiration) return true;
  const expirationMs = parseGmailWatchExpirationMs(watchExpiration);
  if (expirationMs == null) return true;
  return expirationMs - Date.now() <= withinMs;
}
