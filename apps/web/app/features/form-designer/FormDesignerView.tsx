import { BuilderPageShell } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { Link } from "react-router";

import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import {
  DEFAULT_FORM_DESIGN_ROUTE_ID,
  designLayoutFormsHubPath,
} from "../../routing/design-layout-nav";
import { FormDesignerHeaderActions } from "./FormDesignerHeaderActions";
import { FormDesignerOverlayPreview } from "./FormDesignerOverlayPreview";
import { FormDesignerProvider } from "./FormDesignerProvider";
import { FormDesignerTabs } from "./FormDesignerTabs";

interface FormDesignerViewProps {
  readonly entityName: EntityName;
  readonly formDesignId?: string;
}

function FormDesignerPageContent({
  entityName,
  formDesignId = DEFAULT_FORM_DESIGN_ROUTE_ID,
}: {
  readonly entityName: EntityName;
  readonly formDesignId?: string;
}) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const entityLabel = getEntityLabel(definition);
  const designLabel =
    formDesignId === DEFAULT_FORM_DESIGN_ROUTE_ID
      ? t("formDesigner.hub.defaultDesign")
      : (definition.ui.formDesigns?.find((design) => design.id === formDesignId)
          ?.label ?? formDesignId);

  return (
    <BuilderPageShell
      title={t("formDesigner.title")}
      subtitle={t("formDesigner.designSubtitle", {
        entity: entityLabel,
        design: designLabel,
      })}
      actions={<FormDesignerHeaderActions />}
      bodyScrollable={false}
    >
      <div className="mb-4">
        <Link
          className="text-primary text-sm hover:underline"
          to={designLayoutFormsHubPath(entityName)}
        >
          {t("formDesigner.backToDesigns")}
        </Link>
      </div>
      <FormDesignerTabs />
    </BuilderPageShell>
  );
}

export function FormDesignerView({
  entityName,
  formDesignId = DEFAULT_FORM_DESIGN_ROUTE_ID,
}: FormDesignerViewProps) {
  return (
    <FormDesignerProvider entityName={entityName} formDesignId={formDesignId}>
      <div className="flex min-h-0 flex-1 flex-col">
        <FormDesignerPageContent
          entityName={entityName}
          formDesignId={formDesignId}
        />
      </div>
      <FormDesignerOverlayPreview />
    </FormDesignerProvider>
  );
}
