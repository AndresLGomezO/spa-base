/**
 * Layout visibility gated by shared layout conditions (same model as
 * conditionalStyles, without style/badge output).
 */

import type { LayoutCondition } from "../types/styling.js";
import {
  evaluateLayoutConditions,
  type EvaluateLayoutConditionContext,
  type LayoutConditionDashboardDateFilter,
  type LayoutConditionDateGranularity,
} from "../conditions/evaluate-layout-condition.js";

export {
  formatCurrentDateBucket,
  evaluateLayoutConditions,
} from "../conditions/evaluate-layout-condition.js";

export type VisibleWhenDateGranularity = LayoutConditionDateGranularity;
export type VisibleWhenDashboardDateFilter = LayoutConditionDashboardDateFilter;

/**
 * When set on a row/column, the node (and its subtree) only renders when all
 * conditions match. Omitted/empty → visible.
 */
export type LayoutVisibleWhen = readonly LayoutCondition[];

export function resolveVisibleWhen(
  visibleWhen: LayoutVisibleWhen | undefined,
  context: EvaluateLayoutConditionContext = {},
): boolean {
  return evaluateLayoutConditions(visibleWhen, context);
}
