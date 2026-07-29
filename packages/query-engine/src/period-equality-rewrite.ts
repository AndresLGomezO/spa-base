import type {
  DefinedEntity,
  FieldDefinitions,
  NormalizedFieldMeta,
} from "@repo/entities";
import {
  isFilterCondition,
  isFilterGroup,
  type NormalizedFilterCondition,
  type NormalizedFilterNode,
} from "@repo/firestore-converters/filter-tree";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

type PeriodGranularity = "month" | "year";

function parseInstant(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function endOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function detectCalendarPeriod(
  start: Date,
  end: Date,
): { readonly granularity: PeriodGranularity; readonly value: string } | null {
  const monthStart = startOfUtcMonth(start);
  const monthEnd = endOfUtcMonth(start);
  if (
    start.getTime() === monthStart.getTime() &&
    end.getTime() === monthEnd.getTime()
  ) {
    return {
      granularity: "month",
      value: `${start.getUTCFullYear()}-${padTwoDigits(start.getUTCMonth() + 1)}`,
    };
  }

  const yearStart = startOfUtcYear(start);
  const yearEnd = endOfUtcYear(start);
  if (
    start.getTime() === yearStart.getTime() &&
    end.getTime() === yearEnd.getTime()
  ) {
    return {
      granularity: "year",
      value: String(start.getUTCFullYear()),
    };
  }

  return null;
}

function resolveCompanionPeriodField(
  entity: AnyDefinedEntity,
  rangedField: string,
  granularity: PeriodGranularity,
): string | null {
  if (rangedField !== "date") {
    return null;
  }

  const companionName = granularity === "month" ? "month" : "year";
  const meta: NormalizedFieldMeta | undefined =
    entity.metadata.fields[companionName];
  if (!meta || meta.type !== "string") {
    return null;
  }

  return companionName;
}

function tryRewriteAndGroup(
  node: Extract<NormalizedFilterNode, { type: "group" }>,
  entity: AnyDefinedEntity,
): NormalizedFilterNode {
  const children: NormalizedFilterNode[] = node.children.map((child) => {
    const rewritten = rewritePeriodEqualityInTree(child, entity);
    return rewritten ?? child;
  });

  if (node.combinator !== "and") {
    return { ...node, children };
  }

  const rangeByField = new Map<
    string,
    {
      lower?: NormalizedFilterCondition;
      upper?: NormalizedFilterCondition;
    }
  >();

  for (const child of children) {
    if (!isFilterCondition(child)) {
      continue;
    }
    if (child.operator === ">=" || child.operator === ">") {
      const entry = rangeByField.get(child.field) ?? {};
      entry.lower = child;
      rangeByField.set(child.field, entry);
    } else if (child.operator === "<=" || child.operator === "<") {
      const entry = rangeByField.get(child.field) ?? {};
      entry.upper = child;
      rangeByField.set(child.field, entry);
    }
  }

  const replacements = new Map<
    NormalizedFilterNode,
    NormalizedFilterCondition
  >();

  for (const [field, bounds] of rangeByField) {
    if (!bounds.lower || !bounds.upper) {
      continue;
    }
    if (bounds.lower.operator !== ">=" || bounds.upper.operator !== "<=") {
      continue;
    }

    const start = parseInstant(bounds.lower.value);
    const end = parseInstant(bounds.upper.value);
    if (!start || !end) {
      continue;
    }

    const period = detectCalendarPeriod(start, end);
    if (!period) {
      continue;
    }

    const companionField = resolveCompanionPeriodField(
      entity,
      field,
      period.granularity,
    );
    if (!companionField) {
      continue;
    }

    const equality: NormalizedFilterCondition = {
      type: "condition",
      field: companionField,
      operator: "==",
      value: period.value,
    };
    replacements.set(bounds.lower, equality);
    replacements.set(bounds.upper, equality);
  }

  if (replacements.size === 0) {
    return { ...node, children };
  }

  const rewrittenChildren: NormalizedFilterNode[] = [];
  const seenEqualityKeys = new Set<string>();

  for (const child of children) {
    const replacement = replacements.get(child);
    if (!replacement) {
      rewrittenChildren.push(child);
      continue;
    }
    const key = `${replacement.field}:${String(replacement.value)}`;
    if (seenEqualityKeys.has(key)) {
      continue;
    }
    seenEqualityKeys.add(key);
    rewrittenChildren.push(replacement);
  }

  if (rewrittenChildren.length === 1) {
    return rewrittenChildren[0]!;
  }

  return {
    type: "group",
    combinator: "and",
    children: rewrittenChildren,
  };
}

/**
 * Rewrites calendar-aligned date ranges (`date >= monthStart AND date <= monthEnd`)
 * into companion period equality (`month == "YYYY-MM"`) when the entity has a
 * string `month` / `year` field pairing with `date`.
 */
export function rewritePeriodEqualityInTree(
  node: NormalizedFilterNode | null,
  entity: AnyDefinedEntity,
): NormalizedFilterNode | null {
  if (!node) {
    return null;
  }

  if (isFilterCondition(node)) {
    return node;
  }

  if (isFilterGroup(node)) {
    return tryRewriteAndGroup(node, entity);
  }

  return node;
}
