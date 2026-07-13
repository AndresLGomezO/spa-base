export type SubscriptionAliasCandidate = {
  readonly name: string;
  readonly status?: unknown;
  readonly billingAliases?: unknown;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeAliases(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry.length > 0);
}

function isActiveChild(child: SubscriptionAliasCandidate): boolean {
  return child.status == null || child.status === "ACTIVE";
}

/**
 * Resolve a subscription display name from a card charge description by
 * matching against child financial-item `billingAliases`.
 *
 * Prefer case-insensitive exact alias equality; otherwise pick the longest
 * alias that is a substring of the description (stable child order on ties).
 */
export function resolveMatchedSubscriptionName(options: {
  readonly description: unknown;
  readonly children: readonly SubscriptionAliasCandidate[];
}): string | null {
  const description = normalizeText(options.description);
  if (!description) {
    return null;
  }

  const children = options.children.filter(isActiveChild);

  for (const child of children) {
    const aliases = normalizeAliases(child.billingAliases);
    if (aliases.some((alias) => alias === description)) {
      return child.name;
    }
  }

  let bestName: string | null = null;
  let bestLength = 0;
  for (const child of children) {
    for (const alias of normalizeAliases(child.billingAliases)) {
      if (description.includes(alias) && alias.length > bestLength) {
        bestName = child.name;
        bestLength = alias.length;
      }
    }
  }

  return bestName;
}
