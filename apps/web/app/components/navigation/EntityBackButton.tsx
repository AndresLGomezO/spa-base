import { ArrowLeft } from "lucide-react";

import { Button } from "@repo/ui";

import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import type { EntityName } from "../../entities/entity-catalog";
import { useEntityReturnNavigation } from "../../routing/entity-navigation";

interface EntityBackButtonProps {
  readonly entityName: EntityName;
  readonly label?: string;
}

export function EntityBackButton({ entityName, label }: EntityBackButtonProps) {
  const definition = useEntityDefinition(entityName);
  const { navigateBack } = useEntityReturnNavigation(entityName);
  const displayLabel = label ?? getEntityLabel(definition);

  return (
    <Button type="button" variant="ghost" size="sm" onClick={navigateBack}>
      <ArrowLeft className="mr-1 size-4" />
      {displayLabel}
    </Button>
  );
}
