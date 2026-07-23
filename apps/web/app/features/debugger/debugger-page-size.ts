export const DEBUGGER_PAGE_SIZE_OPTIONS = [10, 50, 100, 500, 1000] as const;

export type DebuggerPageSize = (typeof DEBUGGER_PAGE_SIZE_OPTIONS)[number];

const DEFAULT_DEBUGGER_PAGE_SIZE: DebuggerPageSize = 10;

const DEBUGGER_PAGE_SIZE_PARAM = "pageSize";

function isDebuggerPageSize(value: number): value is DebuggerPageSize {
  return (DEBUGGER_PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

export function parseDebuggerPageSize(raw: string | null): DebuggerPageSize {
  if (!raw?.trim()) {
    return DEFAULT_DEBUGGER_PAGE_SIZE;
  }
  const parsed = Number.parseInt(raw, 10);
  return isDebuggerPageSize(parsed) ? parsed : DEFAULT_DEBUGGER_PAGE_SIZE;
}

export function writeDebuggerPageSize(
  params: URLSearchParams,
  pageSize: DebuggerPageSize,
): void {
  if (pageSize === DEFAULT_DEBUGGER_PAGE_SIZE) {
    params.delete(DEBUGGER_PAGE_SIZE_PARAM);
  } else {
    params.set(DEBUGGER_PAGE_SIZE_PARAM, String(pageSize));
  }
}
