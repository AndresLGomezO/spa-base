/** Firestore rejects documents nested deeper than 20 levels. */
export const FIRESTORE_MAX_DOCUMENT_DEPTH = 20;

export const SERIALIZED_LAYOUT_MARKER = "__serializedLayoutJson" as const;

function maxValueDepth(value: unknown): number {
  if (value === null || typeof value !== "object") {
    return 1;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 1;
    }
    return 1 + Math.max(...value.map((item) => maxValueDepth(item)));
  }

  const childDepths = Object.values(value).map((child) => maxValueDepth(child));
  if (childDepths.length === 0) {
    return 1;
  }
  return 1 + Math.max(...childDepths);
}

function isSerializedLayoutMarker(value: unknown): value is Record<
  typeof SERIALIZED_LAYOUT_MARKER,
  string
> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    typeof (value as Record<string, unknown>)[SERIALIZED_LAYOUT_MARKER] ===
      "string"
  );
}

function exceedsFirestoreDepth(
  currentDepth: number,
  value: unknown,
): boolean {
  return currentDepth + maxValueDepth(value) > FIRESTORE_MAX_DOCUMENT_DEPTH;
}

function serializeOverflowingChild(
  currentDepth: number,
  child: unknown,
): unknown {
  const recursed = serializeDeepValuesForFirestore(child, currentDepth + 1);
  if (
    child !== null &&
    typeof child === "object" &&
    exceedsFirestoreDepth(currentDepth + 1, recursed)
  ) {
    return {
      [SERIALIZED_LAYOUT_MARKER]: JSON.stringify(child),
    };
  }
  return recursed;
}

/** Replaces subtrees that would exceed Firestore depth with JSON string markers. */
export function serializeDeepValuesForFirestore(
  value: unknown,
  currentDepth = 0,
): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeOverflowingChild(currentDepth, item));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      serializeOverflowingChild(currentDepth, child),
    ]),
  );
}

/** Restores subtrees previously serialized for Firestore persistence. */
export function deserializeDeepValuesFromFirestore(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (isSerializedLayoutMarker(value)) {
    return JSON.parse(value[SERIALIZED_LAYOUT_MARKER]) as unknown;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deserializeDeepValuesFromFirestore(item));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      deserializeDeepValuesFromFirestore(child),
    ]),
  );
}
