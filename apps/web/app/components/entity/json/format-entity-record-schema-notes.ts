import type { TFunction } from "i18next";

import type {
  EntityRecordFieldDetail,
  EntityRecordFieldSchemaNote,
  EntityRecordImportFieldLocation,
} from "./build-entity-records-import-example.js";

function formatImportLocation(
  location: EntityRecordImportFieldLocation,
  t: TFunction<"common">,
): string {
  switch (location) {
    case "document":
      return t("entity.recordsJson.schemaNotes.importLocationDocument");
    case "relations":
      return t("entity.recordsJson.schemaNotes.importLocationRelations");
    case "not-importable":
      return t("entity.recordsJson.schemaNotes.importLocationNotImportable");
  }
}

function formatFieldDetail(
  detail: EntityRecordFieldDetail,
  t: TFunction<"common">,
): string {
  switch (detail.kind) {
    case "array":
      return t("entity.recordsJson.schemaNotes.detailArray");
    case "enumValues":
      return t("entity.recordsJson.schemaNotes.detailEnumValues", {
        values: detail.values.join(", "),
      });
    case "numberKind":
      return t("entity.recordsJson.schemaNotes.detailNumberKind", {
        kind: detail.value,
      });
    case "relationType":
      return t("entity.recordsJson.schemaNotes.detailRelationType", {
        type: detail.value,
      });
    case "relationTarget":
      return t("entity.recordsJson.schemaNotes.detailRelationTarget", {
        entity: detail.entity,
      });
    case "onDelete":
      return t("entity.recordsJson.schemaNotes.detailOnDelete", {
        value: detail.value,
      });
    case "joinCollection":
      return t("entity.recordsJson.schemaNotes.detailJoinCollection", {
        value: detail.value,
      });
    case "maxSizeBytes":
      return t("entity.recordsJson.schemaNotes.detailMaxSizeBytes", {
        bytes: detail.bytes,
      });
    case "fileReference":
      return t("entity.recordsJson.schemaNotes.detailFileReference");
    case "default":
      return t("entity.recordsJson.schemaNotes.detailDefault", {
        value: JSON.stringify(detail.value),
      });
    case "sensitive":
      return t("entity.recordsJson.schemaNotes.detailSensitive");
    case "idCreateHint":
      return t("entity.recordsJson.schemaNotes.detailIdCreateHint");
    case "idUpdateHint":
      return t("entity.recordsJson.schemaNotes.detailIdUpdateHint");
  }
}

export function formatEntityRecordFieldSchemaNote(
  note: EntityRecordFieldSchemaNote,
  t: TFunction<"common">,
): string {
  const requiredLabel = note.required
    ? t("entity.recordsJson.schemaNotes.fieldRequired")
    : t("entity.recordsJson.schemaNotes.fieldOptional");
  const locationLabel = formatImportLocation(note.importLocation, t);
  const detailLines = note.details.map((detail) =>
    formatFieldDetail(detail, t),
  );

  return [
    `${note.fieldName} (${note.type}, ${requiredLabel}, ${locationLabel})`,
    ...detailLines.map((line) => `  - ${line}`),
  ].join("\n");
}
