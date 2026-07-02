export interface HookExecutionListCursor {
  readonly startedAt: string;
  readonly id: string;
}

export interface HookExecutionListPage {
  readonly items: readonly import("@repo/hooks").DataHookExecutionRecord[];
  readonly nextCursor: HookExecutionListCursor | null;
}

export function encodeHookExecutionListCursor(
  cursor: HookExecutionListCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeHookExecutionListCursor(
  raw: string | null | undefined,
): HookExecutionListCursor | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as HookExecutionListCursor;
    if (
      typeof parsed.startedAt === "string" &&
      parsed.startedAt.trim().length > 0 &&
      typeof parsed.id === "string" &&
      parsed.id.trim().length > 0
    ) {
      return {
        startedAt: parsed.startedAt,
        id: parsed.id,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildHookExecutionNextCursor(
  items: readonly import("@repo/hooks").DataHookExecutionRecord[],
  limit: number,
): HookExecutionListCursor | null {
  if (items.length < limit) {
    return null;
  }

  const last = items[items.length - 1];
  if (!last) {
    return null;
  }

  return {
    startedAt: last.startedAt,
    id: last.id,
  };
}
