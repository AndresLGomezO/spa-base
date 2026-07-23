import type { ListRecentTimeRangeOptions } from "@repo/firestore-converters";
import type { Query } from "firebase-admin/firestore";

/**
 * Apply optional since/until bounds on the same field later used for orderBy.
 * Firestore requires inequality filters and orderBy on the same field.
 */
export function applyListRecentTimeRange(
  query: Query,
  field: string,
  options?: ListRecentTimeRangeOptions,
): Query {
  let next = query;
  if (options?.since) {
    next = next.where(field, ">=", options.since);
  }
  if (options?.until) {
    next = next.where(field, "<=", options.until);
  }
  return next;
}
