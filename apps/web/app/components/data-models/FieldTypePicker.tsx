import { useTranslation } from "react-i18next";

import { Button, Text } from "@repo/ui";

import type { FieldDefinitionInput } from "../../lib/api-client";

import { FIELD_TYPES } from "./field-types";

interface FieldTypePickerProps {
  readonly onSelect: (type: FieldDefinitionInput["type"]) => void;
}

export function FieldTypePicker({ onSelect }: FieldTypePickerProps) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-3">
      <Text className="text-muted-foreground text-sm">
        {t("dataModels.selectFieldType")}
      </Text>
      <div className="grid gap-2 sm:grid-cols-2">
        {FIELD_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            className="h-auto justify-start px-4 py-3 text-left"
            onClick={() => onSelect(type)}
          >
            {t(`dataModels.fieldTypes.${type}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
