import {
  GeoPoint,
  Timestamp,
  type DocumentReference,
} from "firebase-admin/firestore";

function isDocumentReference(value: unknown): value is DocumentReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    "id" in value &&
    "firestore" in value
  );
}

export function serializeFirestoreValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof GeoPoint) {
    return { latitude: value.latitude, longitude: value.longitude };
  }

  if (isDocumentReference(value)) {
    return value.path;
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = serializeFirestoreValue(nested);
    }
    return result;
  }

  return value;
}
