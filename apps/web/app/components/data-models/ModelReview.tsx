import { useTranslation } from "react-i18next";

import { Heading, Text } from "@repo/ui";

import type { FieldDefinitionInput } from "../../lib/api-client";

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
        <ul className="space-y-2">
          {fields.map((field) => (
            <li
              key={field.name}
              className="border-border rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{field.name}</span>
              <span className="text-muted-foreground">
                {" "}
                — {t(`dataModels.fieldTypes.${field.type}`)}
                {field.required ? ` (${t("dataModels.required")})` : ""}
              </span>
              {field.type === "enum" && field.enumValues?.length ? (
                <Text className="text-muted-foreground mt-1">
                  {field.enumValues.join(", ")}
                </Text>
              ) : null}
              {field.type === "relation" && field.relation ? (
                <Text className="text-muted-foreground mt-1">
                  → {field.relation.target} ({field.relation.type})
                </Text>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
