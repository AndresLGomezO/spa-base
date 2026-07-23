import type { EntityCatalogEntry } from "../../entities/entity-catalog";

const SNIPPET_MAX_LENGTH = 180;
const SKIP_RECORD_KEYS = new Set([
  "id",
  "tenantId",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "_schemaVersion",
]);

function isMirrorStorageKey(key: string): boolean {
  return (
    key.endsWith("SearchTokens") || (key.endsWith("Search") && key !== "search")
  );
}

function normalizeSnippetValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/\s+/g, " ");
    return trimmed.length > 0 ? trimmed : null;
  }
  if (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
  ) {
    const joined = value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(", ");
    return joined.length > 0 ? joined : null;
  }
  return null;
}

function truncateSnippet(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  const slice = value.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  return `${slice}…`;
}

function listSnippetFieldNames(
  definition: EntityCatalogEntry | undefined,
  displayField: string | undefined,
): readonly string[] {
  if (!definition) {
    return [];
  }

  const names: string[] = [];
  for (const [fieldName, field] of Object.entries(definition.fields)) {
    if (fieldName === displayField) {
      continue;
    }
    if (field.sensitive === true) {
      continue;
    }
    if (field.type !== "string" && field.type !== "enum") {
      continue;
    }
    names.push(fieldName);
  }
  return names;
}

function collectFallbackFieldNames(
  record: Record<string, unknown>,
  displayField: string | undefined,
): readonly string[] {
  return Object.keys(record).filter((key) => {
    if (SKIP_RECORD_KEYS.has(key) || key === displayField) {
      return false;
    }
    if (isMirrorStorageKey(key)) {
      return false;
    }
    return normalizeSnippetValue(record[key]) != null;
  });
}

export function buildGlobalSearchRecordSnippet(options: {
  readonly record: Record<string, unknown>;
  readonly definition?: EntityCatalogEntry;
  readonly label: string;
  readonly query?: string;
  readonly maxLength?: number;
}): string | undefined {
  const displayField = options.definition?.displayField ?? undefined;
  const definedFields = listSnippetFieldNames(options.definition, displayField);
  const fieldNames =
    definedFields.length > 0
      ? definedFields
      : collectFallbackFieldNames(options.record, displayField);

  const labelNormalized = options.label.trim().toLowerCase();
  const queryNormalized = options.query?.trim().toLowerCase() ?? "";

  const candidates: Array<{ readonly value: string; readonly score: number }> =
    [];

  for (const fieldName of fieldNames) {
    const value = normalizeSnippetValue(options.record[fieldName]);
    if (!value) {
      continue;
    }
    if (value.toLowerCase() === labelNormalized) {
      continue;
    }

    let score = 2;
    if (
      queryNormalized.length > 0 &&
      value.toLowerCase().includes(queryNormalized)
    ) {
      score = 0;
    } else if (
      fieldName === "description" ||
      fieldName === "body" ||
      fieldName === "notes" ||
      fieldName === "subject" ||
      fieldName === "summary"
    ) {
      score = 1;
    }

    candidates.push({ value, score });
  }

  if (candidates.length === 0) {
    return undefined;
  }

  candidates.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    return right.value.length - left.value.length;
  });

  const bestScore = candidates[0]!.score;
  const preferred =
    bestScore === 0
      ? candidates.filter((candidate) => candidate.score === 0)
      : candidates;

  const parts: string[] = [];
  for (const candidate of preferred.slice(0, 2)) {
    if (
      parts.some((part) => part.toLowerCase() === candidate.value.toLowerCase())
    ) {
      continue;
    }
    parts.push(candidate.value);
  }

  if (parts.length === 0) {
    return undefined;
  }

  return truncateSnippet(
    parts.join(" · "),
    options.maxLength ?? SNIPPET_MAX_LENGTH,
  );
}
