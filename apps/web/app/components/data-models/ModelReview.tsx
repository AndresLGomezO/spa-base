import { useTranslation } from "react-i18next";

import { Heading, TableCard, Text } from "@repo/ui";

import type { FieldDefinitionInput } from "../../lib/api-client";

import { FieldDefinitionTable } from "./FieldDefinitionTable";

interface ModelReviewProps {
  readonly name: string;
  readonly label: string;
  readonly fields: readonly FieldDefinitionInput[];
}

export function ModelReview({ name, label, fields }: ModelReviewProps) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-4">
      <div>
        <Heading level={3}>{t("dataModels.reviewTitle")}</Heading>
        <Text>{t("dataModels.reviewDescription")}</Text>
      </div>

      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("dataModels.modelName")}</dt>
          <dd className="font-mono">{name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("dataModels.modelLabel")}
          </dt>
          <dd>{label}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <Text className="font-medium">{t("dataModels.fieldsTitle")}</Text>
        <TableCard>
          <FieldDefinitionTable
            fields={fields}
            canEdit={false}
            onEdit={() => undefined}
          />
        </TableCard>
      </div>
    </div>
  );
}
