import { createHmac } from "node:crypto";

import { QueryError, QueryErrorCode } from "./errors.js";

interface CursorPayload {
  readonly id: string;
  readonly sortValues: Record<string, unknown>;
  readonly v: number;
}

const CURSOR_VERSION = 1;
const ALGORITHM = "sha256";

function sign(payload: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(payload).digest("hex");
}

export function encodeCursor(
  lastItem: Record<string, unknown>,
  sortField: string,
  secret: string,
): string {
  const payload: CursorPayload = {
    id: String(lastItem.id),
    sortValues: {
      [sortField]: lastItem[sortField],
      ...(sortField !== "id" ? { id: lastItem.id } : {}),
    },
    v: CURSOR_VERSION,
  };

  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, "utf-8").toString("base64url");
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function decodeCursor(cursor: string, secret: string): CursorPayload {
  const dotIndex = cursor.lastIndexOf(".");
  if (dotIndex < 0) {
    throw new QueryError(
      QueryErrorCode.INVALID_CURSOR,
      "Invalid pagination cursor.",
    );
  }

  const encoded = cursor.slice(0, dotIndex);
  const signature = cursor.slice(dotIndex + 1);

  const expected = sign(encoded, secret);
  if (signature !== expected) {
    throw new QueryError(
      QueryErrorCode.INVALID_CURSOR,
      "Invalid pagination cursor.",
    );
  }

  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as CursorPayload;
    if (!payload.id || typeof payload.v !== "number") {
      throw new QueryError(
        QueryErrorCode.INVALID_CURSOR,
        "Invalid pagination cursor.",
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof QueryError) {
      throw error;
    }
    throw new QueryError(
      QueryErrorCode.INVALID_CURSOR,
      "Invalid pagination cursor.",
    );
  }
}
