import { Alert } from "@repo/ui";
import type { SerializableEntityDefinition } from "@repo/entities";
import { useTranslation } from "react-i18next";

import { formatFieldLabel } from "../../entities/entity-catalog";

interface EntityFormValidationSummaryProps {
  readonly errors: Readonly<Record<string, string>>;
  readonly definition: SerializableEntityDefinition;
}

export function EntityFormValidationSummary({
  errors,
  definition,
}: EntityFormValidationSummaryProps) {
  const { t } = useTranslation("common");
  const entries = Object.entries(errors);

  if (entries.length === 0) {
    return null;
  }

  return (
    <Alert>
      <p className="font-medium">{t("entity.validationSummary.title")}</p>
      <ul className="mt-2 list-disc pl-5">
        {entries.map(([fieldName, message]) => (
          <li key={fieldName}>
            {t("entity.validationSummary.fieldError", {
              field: formatFieldLabel(fieldName, definition),
              message,
            })}
          </li>
        ))}
      </ul>
    </Alert>
  );
}
