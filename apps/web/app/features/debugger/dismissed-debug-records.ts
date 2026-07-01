const STORAGE_KEY = "debugger:dismissed-records";

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((entry): entry is string => typeof entry === "string"),
    );
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function getDismissedDebugRecordIds(): Set<string> {
  return readDismissedIds();
}

export function dismissDebugRecord(recordKey: string): void {
  const ids = readDismissedIds();
  ids.add(recordKey);
  writeDismissedIds(ids);
}

export function buildDebugRecordKey(source: string, id: string): string {
  return `${source}:${id}`;
}
