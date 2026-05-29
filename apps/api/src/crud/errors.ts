export const ApiErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TENANT_NOT_RESOLVED: "TENANT_NOT_RESOLVED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RELATION_NOT_FOUND: "RELATION_NOT_FOUND",
  RELATION_REQUIRED: "RELATION_REQUIRED",
  RELATION_DELETE_RESTRICTED: "RELATION_DELETE_RESTRICTED",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export interface ApiEnvelope<T> {
  readonly data: T | null;
  readonly error: ApiErrorBody | null;
}
