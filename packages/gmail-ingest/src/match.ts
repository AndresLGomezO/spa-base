import type { EmailMatchBinding } from "./types.js";

function escapeGmailQueryValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

function normalizePattern(pattern: string): {
  readonly kind: "contains" | "regex";
  readonly value: string;
} {
  const trimmed = pattern.trim();
  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    const lastSlash = trimmed.lastIndexOf("/");
    return {
      kind: "regex",
      value: trimmed.slice(1, lastSlash),
    };
  }
  return { kind: "contains", value: trimmed };
}

export function matchesTextPattern(haystack: string, pattern: string): boolean {
  const normalized = normalizePattern(pattern);
  if (!normalized.value) return false;
  if (normalized.kind === "contains") {
    return haystack.toLowerCase().includes(normalized.value.toLowerCase());
  }
  try {
    return new RegExp(normalized.value, "i").test(haystack);
  } catch {
    return haystack.toLowerCase().includes(normalized.value.toLowerCase());
  }
}

export function matchesFromAddress(
  fromHeader: string,
  ruleAddress: string,
): boolean {
  const from = fromHeader.toLowerCase();
  const rule = ruleAddress.trim().toLowerCase();
  if (!rule) return false;
  if (rule.startsWith("@")) {
    return from.includes(rule) || from.endsWith(rule.slice(1));
  }
  return from.includes(rule);
}

export function bindingMatchesMessage(
  binding: Pick<
    EmailMatchBinding,
    "fromAddresses" | "subjectPatterns" | "bodyPatterns" | "enabled"
  >,
  message: {
    readonly from: string;
    readonly subject: string;
    readonly snippet: string;
    readonly bodyText?: string | null;
  },
): boolean {
  if (!binding.enabled) return false;

  const hasFrom = binding.fromAddresses.length > 0;
  const hasSubject = binding.subjectPatterns.length > 0;
  const hasBody = binding.bodyPatterns.length > 0;
  if (!hasFrom && !hasSubject && !hasBody) {
    return false;
  }

  if (
    hasFrom &&
    !binding.fromAddresses.some((address) =>
      matchesFromAddress(message.from, address),
    )
  ) {
    return false;
  }

  if (
    hasSubject &&
    !binding.subjectPatterns.some((pattern) =>
      matchesTextPattern(message.subject, pattern),
    )
  ) {
    return false;
  }

  if (hasBody) {
    const body = `${message.snippet}\n${message.bodyText ?? ""}`;
    if (
      !binding.bodyPatterns.some((pattern) => matchesTextPattern(body, pattern))
    ) {
      return false;
    }
  }

  return true;
}

export function buildGmailSearchQuery(
  bindings: readonly Pick<
    EmailMatchBinding,
    "enabled" | "fromAddresses" | "subjectPatterns" | "gmailQueryExtra"
  >[],
  options?: {
    readonly afterDate?: string;
    readonly beforeDate?: string;
  },
): string | null {
  const enabled = bindings.filter((binding) => binding.enabled);
  if (enabled.length === 0) return null;

  const clauses: string[] = [];

  for (const binding of enabled) {
    const parts: string[] = [];
    for (const from of binding.fromAddresses) {
      parts.push(`from:${from}`);
    }
    for (const subject of binding.subjectPatterns) {
      const normalized = normalizePattern(subject);
      if (normalized.kind === "contains" && normalized.value) {
        parts.push(`subject:"${escapeGmailQueryValue(normalized.value)}"`);
      }
    }
    if (binding.gmailQueryExtra?.trim()) {
      parts.push(`(${binding.gmailQueryExtra.trim()})`);
    }
    if (parts.length > 0) {
      clauses.push(`(${parts.join(" OR ")})`);
    }
  }

  if (clauses.length === 0) return null;

  const queryParts = [`(${clauses.join(" OR ")})`];
  if (options?.afterDate) {
    queryParts.push(`after:${options.afterDate}`);
  }
  if (options?.beforeDate) {
    queryParts.push(`before:${options.beforeDate}`);
  }
  return queryParts.join(" ");
}

export function findBestMatchingBinding<T extends EmailMatchBinding>(
  bindings: readonly T[],
  message: {
    readonly from: string;
    readonly subject: string;
    readonly snippet: string;
    readonly bodyText?: string | null;
  },
): T | null {
  const matches = bindings.filter((binding) =>
    bindingMatchesMessage(binding, message),
  );
  if (matches.length === 0) return null;

  return [...matches].sort((left, right) => {
    const leftScore =
      left.fromAddresses.length * 4 +
      left.subjectPatterns.length * 2 +
      left.bodyPatterns.length;
    const rightScore =
      right.fromAddresses.length * 4 +
      right.subjectPatterns.length * 2 +
      right.bodyPatterns.length;
    return rightScore - leftScore;
  })[0]!;
}

/**
 * Prefer `preferredBindingId` when it matches; otherwise fall back to the
 * best match among enabled bindings (catch-up listing can claim the wrong rule).
 */
export function resolveMatchingBinding<T extends EmailMatchBinding>(
  bindings: readonly T[],
  message: {
    readonly from: string;
    readonly subject: string;
    readonly snippet: string;
    readonly bodyText?: string | null;
  },
  preferredBindingId?: string | null,
): T | null {
  if (preferredBindingId) {
    const preferred = bindings.find(
      (candidate) => candidate.id === preferredBindingId,
    );
    if (preferred && bindingMatchesMessage(preferred, message)) {
      return preferred;
    }
  }
  return findBestMatchingBinding(bindings, message);
}
