import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { DesignSurface, UiLayoutDocument } from "@repo/ui-builder-core";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import {
  UiLayoutStructurePanel,
  type UiLayoutStructurePanelLabels,
} from "@repo/ui-builder-react";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { EntityDefinitionLookup } from "@repo/ui-builder-react";
import { toast } from "@repo/ui";

import { useAnyPermission } from "../../auth/useAnyPermission.js";
import type { EntityName } from "../../entities/entity-catalog";
import { MetricKpiComponentEditor } from "../../components/metrics/MetricKpiComponentEditor.js";
import {
  createUiBuilderPreset,
  listUiBuilderPresets,
} from "../../lib/api-client.js";
import { LayoutStaticImageValueEditor } from "./LayoutStaticImageValueEditor.js";
import { layoutJsonImportLabels } from "./layout-json-import-labels.js";
import {
  layoutPresetInsertLabels,
  layoutPresetLabels,
} from "./layout-preset-labels.js";

interface EntityCardLayoutBuilderProps {
  readonly layout: UiLayoutDocument;
  readonly definition: SerializableEntityDefinition;
  readonly defaultFieldPath: string;
  readonly onLayoutChange: (layout: UiLayoutDocument) => void;
  readonly labels: Omit<UiLayoutStructurePanelLabels, "layoutJsonImport">;
  readonly className?: string;
  readonly showStructureHeading?: boolean;
  readonly getDefinition?: EntityDefinitionLookup;
  readonly designSurface?: DesignSurface;
  /** When true, formWizardShell imports may omit wizard-actions (actions in modal footer). */
  readonly actionsInModalFooter?: boolean;
}

export function EntityCardLayoutBuilder({
  layout,
  definition,
  defaultFieldPath,
  onLayoutChange,
  labels,
  className,
  showStructureHeading = false,
  getDefinition,
  designSurface = "listItem",
  actionsInModalFooter = false,
}: EntityCardLayoutBuilderProps) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const canApplyImport = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);

  const presetsQuery = useQuery({
    queryKey: ["ui-builder-presets"],
    queryFn: async () => {
      const result = await listUiBuilderPresets();
      return result.items;
    },
  });

  const mergedLabels = useMemo(
    (): UiLayoutStructurePanelLabels => ({
      ...labels,
      layoutJsonImport: layoutJsonImportLabels(t),
    }),
    [labels, t],
  );

  const presetStore = useMemo(
    () => ({
      presets: presetsQuery.data ?? [],
      canApplyPresets: canApplyImport,
      presetLabels: layoutPresetLabels(t),
      presetInsertLabels: layoutPresetInsertLabels(t),
      sourceEntityName: definition.name,
      onCreatePreset: async (
        input: Parameters<typeof createUiBuilderPreset>[0],
      ) => {
        await createUiBuilderPreset(input);
        await queryClient.invalidateQueries({
          queryKey: ["ui-builder-presets"],
        });
        toast.success(t("designLayout.presets.savedToStore"));
      },
    }),
    [canApplyImport, definition.name, presetsQuery.data, queryClient, t],
  );

  const filterFieldOptions = useMemo(
    () =>
      Object.keys(definition.fields).filter(
        (field) => definition.fields[field]?.type !== "document",
      ),
    [definition.fields],
  );

  return (
    <UiLayoutStructurePanel
      designSurface={designSurface}
      className={className}
      layout={layout}
      definition={definition}
      defaultFieldPath={defaultFieldPath}
      onLayoutChange={onLayoutChange}
      labels={mergedLabels}
      showStructureHeading={showStructureHeading}
      showShowActionsControl={false}
      getDefinition={getDefinition}
      canApplyImport={canApplyImport}
      actionsInModalFooter={actionsInModalFooter}
      presetStore={presetStore}
      metricKpiEditor={(config, onChange) => (
        <MetricKpiComponentEditor
          config={config}
          entityDefinition={definition}
          filterFieldOptions={filterFieldOptions}
          onChange={onChange}
        />
      )}
      staticImageEditor={({ value, onChange }) => (
        <LayoutStaticImageValueEditor
          entityName={definition.name as EntityName}
          definition={definition}
          value={value}
          onChange={onChange}
          canEdit={canApplyImport}
        />
      )}
    />
  );
}
