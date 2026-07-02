export function pollIntervalForTenantIndexReadiness(
  phase: string | undefined,
  creatingCount: number,
  errorCount: number,
): number | false {
  if (phase === "building" || creatingCount > 0) {
    return 5_000;
  }
  if (phase === "error" || errorCount > 0) {
    return 15_000;
  }
  return false;
}
