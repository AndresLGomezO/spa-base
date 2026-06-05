export interface EntityPayloadSplit {
  readonly documentPayload: Record<string, unknown>;
  readonly relations: Record<string, readonly string[]>;
}

function parseRelations(
  value: unknown,
): Record<string, readonly string[]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const relations: Record<string, readonly string[]> = {};
  for (const [fieldName, targets] of Object.entries(value)) {
    relations[fieldName] = Array.isArray(targets)
      ? targets.filter((entry): entry is string => typeof entry === "string")
      : [];
  }
  return relations;
}

export function splitEntityPayloadFromFile(
  parsed: unknown,
): EntityPayloadSplit {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON file must contain an object.");
  }

  const record = parsed as Record<string, unknown>;
  if ("document" in record) {
    const document = record.document;
    if (
      typeof document !== "object" ||
      document === null ||
      Array.isArray(document)
    ) {
      throw new Error('Combined payload "document" must be an object.');
    }

    return {
      documentPayload: document as Record<string, unknown>,
      relations: parseRelations(record.relations) ?? {},
    };
  }

  return {
    documentPayload: record,
    relations: {},
  };
}

export function parseRelationsFile(parsed: unknown): Record<string, readonly string[]> {
  const relations = parseRelations(parsed);
  if (!relations) {
    throw new Error("Relations file must contain an object of field → id arrays.");
  }
  return relations;
}
