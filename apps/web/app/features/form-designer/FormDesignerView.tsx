import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { FormDesignerHeaderActions } from "./FormDesignerHeaderActions";
import { FormDesignerOverlayPreview } from "./FormDesignerOverlayPreview";
import { FormDesignerProvider } from "./FormDesignerProvider";
import { FormDesignerTabs } from "./FormDesignerTabs";

interface FormDesignerViewProps {
  readonly entityName: EntityName;
}

function FormDesignerPageContent({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityLabel = getEntityLabel(definition);

  return (
    <BuilderPageShell
      title={t("formDesigner.title")}
      subtitle={t("formDesigner.entitySubtitle", { entity: entityLabel })}
      actions={<FormDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <FormDesignerTabs />
    </BuilderPageShell>
  );
}

export function FormDesignerView({ entityName }: FormDesignerViewProps) {
  return (
    <FormDesignerProvider entityName={entityName}>
      <div className="flex min-h-0 flex-1 flex-col">
        <FormDesignerPageContent entityName={entityName} />
      </div>
      <FormDesignerOverlayPreview />
    </FormDesignerProvider>
  );
}
