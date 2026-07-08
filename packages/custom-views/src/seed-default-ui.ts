import { createDefaultExpandableTableView } from "@repo/entities";
import type { CustomViewUIConfig } from "./types.js";

const SYSTEM_FIELD_KEYS = new Set(["id", "tenantId", "createdAt", "updatedAt"]);

export function buildDefaultCustomViewUI(
  sourceEntity: string,
  fieldNames: readonly string[],
): CustomViewUIConfig {
  const fields = fieldNames.filter((name) => !SYSTEM_FIELD_KEYS.has(name));
  const fieldPaths = fields.length > 0 ? fields : ["id"];
  const expandableView = createDefaultExpandableTableView(fieldPaths);

  return {
    views: [
      {
        type: "table",
        name: "default",
        fields: fieldPaths,
      },
      expandableView,
    ],
    listViewType: "expandableTable",
  };
}

export function formatCustomViewLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function slugCustomViewId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
  return slug.length > 0 ? slug : "custom-view";
}
