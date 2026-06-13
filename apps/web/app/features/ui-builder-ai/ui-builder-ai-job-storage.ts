const STORAGE_KEY_PREFIX = "ui-builder-ai:active-job";
const LAST_RUN_KEY_PREFIX = "ui-builder-ai:last-run";

export interface UiBuilderAiJobStorageScope {
  readonly tenantId: string;
  readonly entityName: string;
  readonly surface: string;
}

export interface UiBuilderLastRun {
  readonly jobId: string;
  readonly status: "completed" | "failed";
  readonly error?: string;
  readonly finishedAt: string;
}

function storageKey(scope: UiBuilderAiJobStorageScope): string {
  return `${STORAGE_KEY_PREFIX}:${scope.tenantId}:${scope.entityName}:${scope.surface}`;
}

function lastRunStorageKey(scope: UiBuilderAiJobStorageScope): string {
  return `${LAST_RUN_KEY_PREFIX}:${scope.tenantId}:${scope.entityName}:${scope.surface}`;
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function readActiveUiBuilderJobId(
  scope: UiBuilderAiJobStorageScope,
): string | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const value = sessionStorage.getItem(storageKey(scope))?.trim();
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeActiveUiBuilderJobId(
  scope: UiBuilderAiJobStorageScope,
  jobId: string,
): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.setItem(storageKey(scope), jobId);
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

export function clearActiveUiBuilderJobId(
  scope: UiBuilderAiJobStorageScope,
): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.removeItem(storageKey(scope));
  } catch {
    // Ignore storage errors.
  }
}

function isUiBuilderLastRun(value: unknown): value is UiBuilderLastRun {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.jobId === "string" &&
    record.jobId.trim().length > 0 &&
    (record.status === "completed" || record.status === "failed") &&
    typeof record.finishedAt === "string" &&
    record.finishedAt.trim().length > 0 &&
    (record.error === undefined || typeof record.error === "string")
  );
}

export function readLastUiBuilderRun(
  scope: UiBuilderAiJobStorageScope,
): UiBuilderLastRun | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(lastRunStorageKey(scope));
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isUiBuilderLastRun(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLastUiBuilderRun(
  scope: UiBuilderAiJobStorageScope,
  lastRun: UiBuilderLastRun,
): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.setItem(lastRunStorageKey(scope), JSON.stringify(lastRun));
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

export function clearLastUiBuilderRun(scope: UiBuilderAiJobStorageScope): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.removeItem(lastRunStorageKey(scope));
  } catch {
    // Ignore storage errors.
  }
}
