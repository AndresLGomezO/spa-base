import type {
  CustomViewDefinitionFormData,
  CustomViewUIConfig,
} from "@repo/custom-views/browser";
import { slugCustomViewId } from "@repo/custom-views/browser";

import {
  toCustomViewUIConfig,
  toPortableCustomViewUi,
} from "../../../custom-views/normalize-custom-view-ui";
import type { CustomViewRecord } from "../../../lib/api-client";

export interface CustomViewFormStateExportInput {
  readonly name: string;
  readonly description: string;
  readonly entityQueryDefinitionName: string;
  readonly viewId?: string;
  readonly navLabel: string;
  readonly navIcon: string;
  readonly navCategoryId: string;
  readonly navOrder: string;
  readonly hiddenFromNav: boolean;
  readonly status: "ACTIVE" | "PAUSED";
  readonly ui?: CustomViewUIConfig;
}

export function exportCustomViewFormState(
  input: CustomViewFormStateExportInput,
): CustomViewDefinitionFormData {
  const navOrder =
    input.navOrder.trim().length > 0 ? Number(input.navOrder) : undefined;

  return {
    name: input.name.trim(),
    ...(input.description.trim()
      ? { description: input.description.trim() }
      : {}),
    viewId:
      input.viewId && input.viewId.trim().length > 0
        ? input.viewId.trim().toLowerCase()
        : slugCustomViewId(input.name),
    entityQueryDefinitionName: input.entityQueryDefinitionName,
    status: input.status,
    hiddenFromNav: input.hiddenFromNav,
    ...(input.navCategoryId.trim()
      ? { navCategoryId: input.navCategoryId.trim() }
      : {}),
    ...(navOrder !== undefined && !Number.isNaN(navOrder) ? { navOrder } : {}),
    nav: {
      label: input.navLabel.trim() || input.name.trim(),
      ...(input.navIcon.trim() ? { icon: input.navIcon.trim() } : {}),
    },
    ...(input.ui !== undefined ? { ui: toPortableCustomViewUi(input.ui) } : {}),
  };
}

export function exportCustomViewRecord(
  record: CustomViewRecord,
  entityQueryDefinitionName: string,
): CustomViewDefinitionFormData {
  return exportCustomViewFormState({
    name: record.name,
    description: record.description ?? "",
    entityQueryDefinitionName,
    viewId: record.viewId,
    navLabel: record.nav.label,
    navIcon: record.nav.icon ?? "",
    navCategoryId: record.navCategoryId ?? "",
    navOrder: record.navOrder !== undefined ? String(record.navOrder) : "",
    hiddenFromNav: record.hiddenFromNav ?? false,
    status: record.status,
    ui: toCustomViewUIConfig(record.ui),
  });
}

export interface CustomViewFormStateImportResult {
  readonly name: string;
  readonly description: string;
  readonly entityQueryDefinitionName: string;
  readonly viewId: string;
  readonly navLabel: string;
  readonly navIcon: string;
  readonly navCategoryId: string;
  readonly navOrder: string;
  readonly hiddenFromNav: boolean;
  readonly status: "ACTIVE" | "PAUSED";
  readonly ui?: CustomViewUIConfig;
}

export function importCustomViewFormState(
  data: CustomViewDefinitionFormData,
): CustomViewFormStateImportResult {
  return {
    name: data.name,
    description: data.description ?? "",
    entityQueryDefinitionName: data.entityQueryDefinitionName,
    viewId: data.viewId,
    navLabel: data.nav.label,
    navIcon: data.nav.icon ?? "",
    navCategoryId: data.navCategoryId ?? "",
    navOrder: data.navOrder !== undefined ? String(data.navOrder) : "",
    hiddenFromNav: data.hiddenFromNav ?? false,
    status: data.status,
    ...(data.ui !== undefined ? { ui: toCustomViewUIConfig(data.ui) } : {}),
  };
}

export function resolveQueryNameById(
  queries: readonly { readonly id: string; readonly name: string }[],
  entityQueryDefinitionId: string,
): string {
  return (
    queries.find((query) => query.id === entityQueryDefinitionId)?.name ?? ""
  );
}

export function resolveQueryIdByName(
  queries: readonly { readonly id: string; readonly name: string }[],
  entityQueryDefinitionName: string,
): string | undefined {
  return queries.find((query) => query.name === entityQueryDefinitionName)?.id;
}
