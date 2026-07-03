import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import { Button } from "@repo/ui";

import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import type { EntityName } from "../../entities/entity-catalog";
import {
  resolveEntityListPath,
  useEntityReturnNavigation,
} from "../../routing/entity-navigation";

interface EntityBackButtonProps {
  readonly entityName: EntityName;
}

function returnToPathname(returnTo: string): string {
  const questionIndex = returnTo.indexOf("?");
  return questionIndex === -1 ? returnTo : returnTo.slice(0, questionIndex);
}

export function EntityBackButton({ entityName }: EntityBackButtonProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const definition = useEntityDefinition(entityName);
  const { returnTo, navigateBack } = useEntityReturnNavigation(entityName);
  const listPath = resolveEntityListPath(entityName, location.pathname);
  const entityLabel = getEntityLabel(definition);

  const displayLabel = useMemo(() => {
    const returnPathname = returnToPathname(returnTo);
    if (returnPathname === listPath) {
      return entityLabel;
    }
    if (returnPathname === "/notifications") {
      return t("notifications.pageTitle");
    }
    if (returnPathname === "/") {
      return t("nav.home");
    }
    return t("navigation.back");
  }, [entityLabel, listPath, returnTo, t]);

  return (
    <Button type="button" variant="ghost" size="sm" onClick={navigateBack}>
      <ArrowLeft className="mr-1 size-4" />
      {displayLabel}
    </Button>
  );
}
