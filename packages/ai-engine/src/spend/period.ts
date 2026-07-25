/** Calendar month in UTC as `YYYY-MM`. */
export function aiSpendPeriodKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function tenantAiSpendDocId(period: string): string {
  return `period_${period}`;
}

export function userAiSpendDocId(userId: string, period: string): string {
  return `${userId}_${period}`;
}
