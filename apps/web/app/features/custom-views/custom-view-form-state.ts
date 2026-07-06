import type { CustomViewRecord } from "../../lib/api-client";

export interface CustomViewFormState {
  readonly name: string;
  readonly description: string;
  readonly entityQueryDefinitionId: string;
  readonly navLabel: string;
  readonly navIcon: string;
  readonly navCategoryId: string;
  readonly navOrder: string;
  readonly hiddenFromNav: boolean;
  readonly status: "ACTIVE" | "PAUSED";
}

export function customViewFormFromRecord(
  record: CustomViewRecord,
): CustomViewFormState {
  return {
    name: record.name,
    description: record.description ?? "",
    entityQueryDefinitionId: record.entityQueryDefinitionId,
    navLabel: record.nav.label,
    navIcon: record.nav.icon ?? "",
    navCategoryId: record.navCategoryId ?? "",
    navOrder: record.navOrder !== undefined ? String(record.navOrder) : "",
    hiddenFromNav: record.hiddenFromNav ?? false,
    status: record.status,
  };
}

export function buildCustomViewPayloadFromForm(form: CustomViewFormState) {
  const navOrder =
    form.navOrder.trim().length > 0 ? Number(form.navOrder) : undefined;

  return {
    name: form.name.trim(),
    ...(form.description.trim()
      ? { description: form.description.trim() }
      : {}),
    entityQueryDefinitionId: form.entityQueryDefinitionId,
    status: form.status,
    hiddenFromNav: form.hiddenFromNav,
    ...(form.navCategoryId.trim()
      ? { navCategoryId: form.navCategoryId.trim() }
      : {}),
    ...(navOrder !== undefined && !Number.isNaN(navOrder) ? { navOrder } : {}),
    nav: {
      label: form.navLabel.trim() || form.name.trim(),
      ...(form.navIcon.trim() ? { icon: form.navIcon.trim() } : {}),
    },
  };
}

export function isCustomViewFormDirty(
  form: CustomViewFormState,
  record: CustomViewRecord,
): boolean {
  return (
    JSON.stringify(form) !== JSON.stringify(customViewFormFromRecord(record))
  );
}
