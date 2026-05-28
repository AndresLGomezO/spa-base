function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasToDate(value: unknown): value is { toDate: () => Date } {
  return isObject(value) && typeof value.toDate === "function";
}

function hasSecondsAndNanoseconds(
  value: unknown,
): value is { seconds: number; nanoseconds: number } {
  return (
    isObject(value) &&
    typeof value.seconds === "number" &&
    typeof value.nanoseconds === "number"
  );
}

function fromSecondsAndNanoseconds(value: {
  seconds: number;
  nanoseconds: number;
}): string {
  const millis =
    value.seconds * 1_000 + Math.floor(value.nanoseconds / 1_000_000);
  return new Date(millis).toISOString();
}

function normalizeSingleTimestamp(value: unknown): unknown {
  if (hasToDate(value)) {
    return value.toDate().toISOString();
  }
  if (hasSecondsAndNanoseconds(value)) {
    return fromSecondsAndNanoseconds(value);
  }
  return value;
}

export function normalizeFirestoreTimestamps(value: unknown): unknown {
  const normalizedValue = normalizeSingleTimestamp(value);
  if (Array.isArray(normalizedValue)) {
    return normalizedValue.map((entry) => normalizeFirestoreTimestamps(entry));
  }
  if (isObject(normalizedValue)) {
    return Object.fromEntries(
      Object.entries(normalizedValue).map(([key, entry]) => [
        key,
        normalizeFirestoreTimestamps(entry),
      ]),
    );
  }
  return normalizedValue;
}
