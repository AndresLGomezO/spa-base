import { sortFieldsByUiOrder } from "@repo/ui-builder";
import type { TFunction } from "i18next";

import type { FieldDefinitionInput } from "../../lib/api-client";

interface IndexedFieldDefinition {
  readonly field: FieldDefinitionInput;
  readonly index: number;
}

function fieldSortKey(field: FieldDefinitionInput, index: number): string {
  return field.name.trim() || `__index_${index}`;
}

export function sortIndexedFieldDefinitions(
  fields: readonly FieldDefinitionInput[],
): readonly IndexedFieldDefinition[] {
  const indexed = fields.map((field, index) => ({ field, index }));
  const uiFields = Object.fromEntries(
    indexed.map(({ field, index }) => [
      fieldSortKey(field, index),
      { order: field.ui?.order ?? index },
    ]),
  );
  const names = indexed.map(({ field, index }) => fieldSortKey(field, index));
  const sortedNames = sortFieldsByUiOrder(names, uiFields);

  return sortedNames.map((name) => {
    const match = indexed.find(
      (entry) => fieldSortKey(entry.field, entry.index) === name,
    );
    if (!match) {
      throw new Error(`Missing field for sort key "${name}".`);
    }
    return match;
  });
}

export function summarizeFieldDetails(
  field: FieldDefinitionInput,
  t: TFunction<"common">,
): string {
  const parts: string[] = [];

  if (field.type === "number") {
    if (field.numberKind === "integer") {
      parts.push(t("dataModels.numberKinds.integer"));
    } else if (field.numberKind === "decimal") {
      parts.push(t("dataModels.numberKinds.decimal"));
    }
    if (field.ui?.displayFormat === "currency") {
      parts.push(t("dataModels.numberDisplayFormats.currency"));
    } else if (field.ui?.displayFormat === "percentage") {
      parts.push(t("dataModels.numberDisplayFormats.percentage"));
    }
  }

  if (field.type === "date" && field.ui?.dateDisplayFormat) {
    parts.push(
      t(`dataModels.dateDisplayFormats.${field.ui.dateDisplayFormat}`),
    );
  }

  if (field.type === "enum") {
    const count = (field.enumValues ?? []).filter((value) =>
      value.trim(),
    ).length;
    if (count > 0) {
      parts.push(t("dataModels.fieldDetailsEnumCount", { count }));
    }
  }

  if (field.type === "relation" && field.relation?.target) {
    parts.push(
      t("dataModels.fieldDetailsRelation", {
        target: field.relation.target,
        type: field.relation.type,
      }),
    );
  }

  return parts.join(" · ");
}
