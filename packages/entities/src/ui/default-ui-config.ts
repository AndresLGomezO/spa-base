import { createDefaultFormLayout } from "@repo/ui-builder-core";
import type { DefinedEntity, FieldDefinitions } from "../types.js";
import type { EntityUIConfig, ViewConfig } from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const SYSTEM_FIELD_KEYS = new Set(["id", "tenantId", "createdAt", "updatedAt"]);

function getEditableFieldNames(entity: AnyDefinedEntity): string[] {
  return Object.keys(entity.metadata.fields).filter((fieldName) => {
    if (SYSTEM_FIELD_KEYS.has(fieldName)) {
      return false;
    }
    return entity.metadata.fields[fieldName]?.type !== "document";
  });
}

function buildDefaultFormLayout(entity: AnyDefinedEntity) {
  const fields = getEditableFieldNames(entity);
  return {
    layout: createDefaultFormLayout(fields),
  };
}

function buildDefaultTableView(entity: AnyDefinedEntity): ViewConfig {
  return {
    type: "table",
    name: "default",
    fields: getEditableFieldNames(entity),
  };
}

function formatEntityLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function getDefaultEntityUI(entity: AnyDefinedEntity): EntityUIConfig {
  const formLayout = buildDefaultFormLayout(entity);
  return {
    views: [buildDefaultTableView(entity)],
    forms: {
      create: formLayout,
      edit: formLayout,
    },
    nav: {
      label: formatEntityLabel(entity.name),
    },
  };
}

export function resolveEntityUI(
  entity: AnyDefinedEntity,
  ui?: EntityUIConfig,
): EntityUIConfig {
  if (!ui) {
    return getDefaultEntityUI(entity);
  }
  return ui;
}

export function resolveView(
  entity: AnyDefinedEntity,
  ui: EntityUIConfig,
  viewName?: string,
): ViewConfig {
  if (viewName) {
    const view = ui.views.find((entry) => entry.name === viewName);
    if (!view) {
      throw new Error(
        `View "${viewName}" not found for entity "${entity.name}".`,
      );
    }
    return view;
  }
  const tableView = ui.views.find((entry) => entry.type === "table");
  if (tableView) {
    return tableView;
  }
  return ui.views[0] ?? getDefaultEntityUI(entity).views[0]!;
}

export function getFieldUI(
  entity: AnyDefinedEntity,
  ui: EntityUIConfig,
  fieldName: string,
) {
  return ui.fields?.[fieldName];
}
