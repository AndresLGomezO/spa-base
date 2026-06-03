import { Alert, Heading, Text } from "@repo/ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";

interface DesignLayoutPageHeaderProps {
  readonly entityName: EntityName;
  readonly title: string;
  readonly description: string;
  readonly readOnly?: boolean;
  readonly actions?: ReactNode;
}

export function DesignLayoutPageHeader({
  entityName,
  title,
  description,
  readOnly = false,
  actions,
}: DesignLayoutPageHeaderProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityLabel = getEntityLabel(definition);

  return (
    <div className="shrink-0 space-y-2">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        {t("designLayout.backToHome")}
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Heading level={1}>{title}</Heading>
          <Text>
            {t("designLayout.entityContext", { entity: entityLabel })}
          </Text>
          <Text>{description}</Text>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {readOnly ? <Alert>{t("designLayout.readOnly")}</Alert> : null}
    </div>
  );
}
