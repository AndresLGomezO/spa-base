import type { CustomViewUIConfig } from "@repo/custom-views";
import {
  validateEntityUIConfig,
  type DefinedEntity,
  type EntityUIConfig,
  type FieldDefinitions,
} from "@repo/entities";
import {
  createDefaultFormLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function toEntityUIConfig(ui: CustomViewUIConfig): EntityUIConfig {
  const emptyFormLayout = {
    layout: createDefaultFormLayout([]) as UiLayoutDocument,
  };

  return {
    views: ui.views,
    ...(ui.listViewType ? { listViewType: ui.listViewType } : {}),
    ...(ui.listItem ? { listItem: ui.listItem } : {}),
    ...(ui.mainPageLayout ? { mainPageLayout: ui.mainPageLayout } : {}),
    ...(ui.metricRowLayout ? { metricRowLayout: ui.metricRowLayout } : {}),
    ...(ui.metricWidgets ? { metricWidgets: ui.metricWidgets } : {}),
    ...(ui.fields ? { fields: ui.fields } : {}),
    forms: {
      create: emptyFormLayout,
      edit: emptyFormLayout,
    },
    nav: { label: "Custom View" },
  };
}

export function validateCustomViewUIConfig(
  entity: AnyDefinedEntity,
  ui: CustomViewUIConfig,
): CustomViewUIConfig {
  validateEntityUIConfig(entity, toEntityUIConfig(ui));
  return ui;
}

export function getEntityFieldNames(entity: AnyDefinedEntity): string[] {
  const systemFields = new Set(["id", "tenantId", "createdAt", "updatedAt"]);
  return Object.keys(entity.metadata.fields).filter(
    (name) => !systemFields.has(name),
  );
}
