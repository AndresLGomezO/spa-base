export const QueryErrorCode = {
  QUERY_VALIDATION_ERROR: "QUERY_VALIDATION_ERROR",
  QUERY_UNSUPPORTED: "QUERY_UNSUPPORTED",
  QUERY_FORBIDDEN: "QUERY_FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  QUERY_ON_ENCRYPTED_FIELD: "QUERY_ON_ENCRYPTED_FIELD",
  COMPOSITE_INDEX_REQUIRED: "COMPOSITE_INDEX_REQUIRED",
  SEARCH_NOT_CONFIGURED: "SEARCH_NOT_CONFIGURED",
  INVALID_CURSOR: "INVALID_CURSOR",
  QUERY_TOO_BROAD: "QUERY_TOO_BROAD",
} as const;

export type QueryErrorCode =
  (typeof QueryErrorCode)[keyof typeof QueryErrorCode];

export class QueryError extends Error {
  readonly code: QueryErrorCode;

  constructor(code: QueryErrorCode, message: string) {
    super(message);
    this.name = "QueryError";
    this.code = code;
  }
}
