import type { ColumnNode } from "../types/layout.js";

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function distributeWithRemainderOnLast(
  count: number,
  total: number,
): readonly number[] {
  if (count <= 0) {
    return [];
  }
  const base = Math.floor(total / count);
  const result = Array.from({ length: count }, () => base);
  const remainder = total - sum(result);
  if (remainder > 0) {
    const last = result[result.length - 1];
    if (last !== undefined) {
      result[result.length - 1] = last + remainder;
    }
  }
  return result;
}

function normalizeExplicitTo100(
  explicit: readonly number[],
): readonly number[] {
  const total = sum(explicit);
  if (total <= 0 || explicit.length === 0) {
    return distributeWithRemainderOnLast(explicit.length, 100);
  }

  const scaled = explicit.map((value) => Math.floor((value * 100) / total));
  const remainder = 100 - sum(scaled);
  if (remainder > 0 && scaled.length > 0) {
    const last = scaled[scaled.length - 1];
    if (last !== undefined) {
      scaled[scaled.length - 1] = last + remainder;
    }
  }
  return scaled;
}

/**
 * Resolves each column to an integer percent (1–100) that always sums to 100.
 * Columns without `widthPercent` share the remainder equally.
 */
export function resolveColumnWidthPercents(
  columns: readonly ColumnNode[],
): readonly number[] {
  const count = columns.length;
  if (count === 0) {
    return [];
  }

  const explicitValues = columns.map((column) => column.widthPercent);
  const autoIndices: number[] = [];
  const explicitIndices: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const value = explicitValues[index];
    if (value === undefined) {
      autoIndices.push(index);
    } else {
      explicitIndices.push(index);
    }
  }

  if (autoIndices.length === 0) {
    const explicit = explicitIndices.map((index) => explicitValues[index] ?? 0);
    return normalizeExplicitTo100(explicit);
  }

  if (explicitIndices.length === 0) {
    return distributeWithRemainderOnLast(count, 100);
  }

  const explicitSum = sum(
    explicitIndices.map((index) => explicitValues[index] ?? 0),
  );
  const remainder = Math.max(0, 100 - explicitSum);
  const autoShares = distributeWithRemainderOnLast(
    autoIndices.length,
    remainder,
  );

  const resolved = Array.from({ length: count }, () => 0);
  explicitIndices.forEach((index) => {
    resolved[index] = explicitValues[index] ?? 0;
  });
  autoIndices.forEach((index, autoIndex) => {
    resolved[index] = autoShares[autoIndex] ?? 0;
  });

  const resolvedSum = sum(resolved);
  if (resolvedSum !== 100 && resolved.length > 0) {
    const lastIndex = resolved.length - 1;
    const last = resolved[lastIndex];
    if (last !== undefined) {
      resolved[lastIndex] = last + (100 - resolvedSum);
    }
  }

  return resolved;
}

export function buildGridTemplateColumnsFromPercents(
  percents: readonly number[],
): string {
  return percents.map((percent) => `minmax(0, ${percent}fr)`).join(" ");
}
