import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import { IconButton, Popover, Text } from "@repo/ui";

import type { RelationType } from "./generate-relation-field-name";

const RELATION_TYPE_I18N_KEYS: Record<
  RelationType,
  "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany"
> = {
  "one-to-one": "oneToOne",
  "one-to-many": "oneToMany",
  "many-to-one": "manyToOne",
  "many-to-many": "manyToMany",
};

interface RelationTypeInfoProps {
  readonly relationType: RelationType;
}

export function RelationTypeInfo({ relationType }: RelationTypeInfoProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const key = RELATION_TYPE_I18N_KEYS[relationType];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="right-start"
      title={t(`dataModels.relationTypes.${key}.title`)}
      trigger={
        <IconButton
          label={t("dataModels.relationTypeInfoLabel")}
          size="sm"
          className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0"
        >
          <Info className="h-4 w-4" aria-hidden />
        </IconButton>
      }
    >
      <div className="space-y-2">
        <Text className="text-muted-foreground text-sm">
          {t(`dataModels.relationTypes.${key}.description`)}
        </Text>
        <Text className="text-sm">
          <span className="font-medium">
            {t("dataModels.relationTypes.exampleLabel")}:{" "}
          </span>
          {t(`dataModels.relationTypes.${key}.example`)}
        </Text>
      </div>
    </Popover>
  );
}
