export const RelationErrorCode = {
  RELATION_NOT_FOUND: "RELATION_NOT_FOUND",
  RELATION_REQUIRED: "RELATION_REQUIRED",
  RELATION_DELETE_RESTRICTED: "RELATION_DELETE_RESTRICTED",
  REFERENCE_ACCESS_DENIED: "REFERENCE_ACCESS_DENIED",
} as const;

export type RelationErrorCode =
  (typeof RelationErrorCode)[keyof typeof RelationErrorCode];

export class RelationError extends Error {
  readonly code: RelationErrorCode;

  constructor(code: RelationErrorCode, message: string) {
    super(message);
    this.name = "RelationError";
    this.code = code;
  }
}
