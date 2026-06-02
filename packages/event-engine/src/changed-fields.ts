function valuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

export function computeChangedFields(input: {
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
  readonly businessFieldNames: readonly string[];
}): readonly string[] {
  const changed: string[] = [];
  const before = input.before ?? {};
  const after = input.after ?? {};

  for (const field of input.businessFieldNames) {
    if (!valuesEqual(before[field], after[field])) {
      changed.push(field);
    }
  }

  return changed;
}
