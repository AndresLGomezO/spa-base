export const QueryErrorCode = {
  QUERY_VALIDATION_ERROR: "QUERY_VALIDATION_ERROR",
  QUERY_UNSUPPORTED: "QUERY_UNSUPPORTED",
  QUERY_FORBIDDEN: "QUERY_FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
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
