import type {
  SerializableEntityDefinition,
  SerializableFieldMeta,
} from "@repo/entities";

export type EntityRecordImportFieldLocation =
  | "document"
  | "relations"
  | "not-importable";

export type EntityRecordFieldDetail =
  | { readonly kind: "array" }
  | { readonly kind: "enumValues"; readonly values: readonly string[] }
  | { readonly kind: "numberKind"; readonly value: "integer" | "decimal" }
  | { readonly kind: "relationType"; readonly value: string }
  | { readonly kind: "relationTarget"; readonly entity: string }
  | { readonly kind: "onDelete"; readonly value: string }
  | { readonly kind: "joinCollection"; readonly value: string }
  | { readonly kind: "maxSizeBytes"; readonly bytes: number }
  | { readonly kind: "fileReference" }
  | { readonly kind: "default"; readonly value: string | number | boolean }
  | { readonly kind: "sensitive" }
  | { readonly kind: "idCreateHint" }
  | { readonly kind: "idUpdateHint" };

export interface EntityRecordFieldSchemaNote {
  readonly fieldName: string;
  readonly type: string;
  readonly required: boolean;
  readonly importLocation: EntityRecordImportFieldLocation;
  readonly details: readonly EntityRecordFieldDetail[];
}

interface EntityRecordsImportExample {
  readonly document: Record<string, unknown>;
  readonly relations: Record<string, readonly string[]>;
  readonly fieldNotes: readonly EntityRecordFieldSchemaNote[];
}

function resolveImportLocation(
  meta: SerializableFieldMeta,
): EntityRecordImportFieldLocation {
  if (meta.type !== "relation" || !meta.relation) {
    return "document";
  }

  if (meta.relation.type === "many-to-many") {
    return "relations";
  }

  if (meta.relation.type === "one-to-many") {
    return "not-importable";
  }

  return "document";
}

function sampleScalarValue(meta: SerializableFieldMeta): unknown {
  if (meta.default !== undefined) {
    return meta.default;
  }

  switch (meta.type) {
    case "string":
      return "example-text";
    case "number":
      return meta.numberKind === "integer" ? 1 : 1.5;
    case "boolean":
      return true;
    case "date":
      return "2026-01-15T12:00:00.000Z";
    case "enum":
      return meta.enumValues?.[0] ?? "enum-value";
    case "relation":
      return "existing-target-record-id";
    case "image":
      return {
        storagePath: "tenants/TENANT_ID/entity-files/ENTITY/image_example.jpg",
        contentType: "image/jpeg",
        fileName: "example.jpg",
      };
    case "document":
      return {
        storagePath:
          "tenants/TENANT_ID/entity-files/ENTITY/document_example.pdf",
        contentType: "application/pdf",
        fileName: "example.pdf",
      };
    default:
      return null;
  }
}

function sampleValueForField(meta: SerializableFieldMeta): unknown {
  const scalar = sampleScalarValue(meta);
  if (meta.isArray) {
    return [scalar];
  }
  return scalar;
}

function buildFieldDetails(
  meta: SerializableFieldMeta,
): EntityRecordFieldDetail[] {
  const details: EntityRecordFieldDetail[] = [];

  if (meta.isArray) {
    details.push({ kind: "array" });
  }

  if (meta.type === "enum" && meta.enumValues && meta.enumValues.length > 0) {
    details.push({ kind: "enumValues", values: meta.enumValues });
  }

  if (meta.type === "number" && meta.numberKind) {
    details.push({ kind: "numberKind", value: meta.numberKind });
  }

  if (meta.type === "relation" && meta.relation) {
    details.push({ kind: "relationType", value: meta.relation.type });
    details.push({ kind: "relationTarget", entity: meta.relation.target });
    if (meta.relation.onDelete) {
      details.push({ kind: "onDelete", value: meta.relation.onDelete });
    }
    if (meta.relation.joinCollection) {
      details.push({
        kind: "joinCollection",
        value: meta.relation.joinCollection,
      });
    }
  }

  if (
    (meta.type === "image" || meta.type === "document") &&
    meta.maxSizeBytes
  ) {
    details.push({ kind: "maxSizeBytes", bytes: meta.maxSizeBytes });
  }

  if (meta.type === "image" || meta.type === "document") {
    details.push({ kind: "fileReference" });
  }

  if (meta.default !== undefined) {
    details.push({ kind: "default", value: meta.default });
  }

  if (meta.sensitive) {
    details.push({ kind: "sensitive" });
  }

  return details;
}

export function buildEntityRecordsImportExample(
  definition: SerializableEntityDefinition,
): EntityRecordsImportExample {
  const document: Record<string, unknown> = {
    id: "optional-existing-record-id",
  };
  const relations: Record<string, readonly string[]> = {};
  const fieldNotes: EntityRecordFieldSchemaNote[] = [
    {
      fieldName: "id",
      type: "string",
      required: false,
      importLocation: "document",
      details: [{ kind: "idCreateHint" }, { kind: "idUpdateHint" }],
    },
  ];

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    const importLocation = resolveImportLocation(meta);
    fieldNotes.push({
      fieldName,
      type: meta.type,
      required: meta.required === true,
      importLocation,
      details: buildFieldDetails(meta),
    });

    if (importLocation === "document") {
      document[fieldName] = sampleValueForField(meta);
    }

    if (importLocation === "relations") {
      relations[fieldName] = ["existing-target-record-id"];
    }
  }

  return { document, relations, fieldNotes };
}

export function formatEntityRecordsImportExampleJson(
  example: EntityRecordsImportExample,
): string {
  const payload: Record<string, unknown> = { ...example.document };

  if (Object.keys(example.relations).length > 0) {
    payload.relations = example.relations;
  }

  return JSON.stringify(payload, null, 2);
}
