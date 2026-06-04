import {
  defineEntityFromRecord,
  type EntityDefinitionRecord as DynamicEntityDefinitionRecord,
} from "@repo/dynamic-entities";
import {
  planIndexesForEntity,
  planIndexesForTenant,
  type EntityIndexPlan,
  type TenantIndexPlan,
} from "@repo/firestore-indexes";

import type {
  EntityDefinitionRecord,
  FieldDefinitionInput,
} from "../../lib/api-client";

import { buildEntityDefinitionUiForSave } from "./build-entity-definition-ui-patch";

export interface PlanEntityIndexesInput {
  readonly tenantId?: string;
  readonly name: string;
  readonly label: string;
  readonly fields: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
  readonly record?: EntityDefinitionRecord | null;
  readonly navIcon?: string;
}

function buildDraftEntityDefinitionRecord(
  input: PlanEntityIndexesInput,
): EntityDefinitionRecord | null {
  const name = input.name.trim();
  if (!name) {
    return null;
  }

  const ui = buildEntityDefinitionUiForSave({
    record: input.record ?? null,
    label: input.label,
    fields: input.fields,
    navIcon: input.navIcon ?? "",
  });

  const placeholderTimestamp = new Date(0).toISOString();

  return {
    id: input.record?.id ?? "__draft__",
    tenantId: input.tenantId ?? input.record?.tenantId ?? "__draft__",
    name,
    label: input.label.trim() || input.record?.label || name,
    fields: input.fields,
    ...(input.tenantWideRead ? { tenantWideRead: true } : {}),
    ...(input.record?.hiddenFromNav ? { hiddenFromNav: true } : {}),
    ...(input.record?.navCategoryId
      ? { navCategoryId: input.record.navCategoryId }
      : {}),
    ...(input.record?.navOrder !== undefined
      ? { navOrder: input.record.navOrder }
      : {}),
    ...(input.record?.displayField
      ? { displayField: input.record.displayField }
      : {}),
    ...(ui ? { ui } : {}),
    version: input.record?.version ?? 0,
    createdAt: input.record?.createdAt ?? placeholderTimestamp,
    updatedAt: input.record?.updatedAt ?? placeholderTimestamp,
  };
}

export function planEntityIndexesFromDraft(
  input: PlanEntityIndexesInput,
): EntityIndexPlan | null {
  const record = buildDraftEntityDefinitionRecord(input);
  if (!record) {
    return null;
  }

  try {
    const entity = defineEntityFromRecord(toMutableDefinitionRecord(record));
    return planIndexesForEntity(entity);
  } catch {
    return null;
  }
}

function toMutableDefinitionRecord(
  record: EntityDefinitionRecord,
): DynamicEntityDefinitionRecord {
  return {
    ...record,
    fields: record.fields.map((field) => ({
      ...field,
      ...(field.enumValues ? { enumValues: [...field.enumValues] } : {}),
    })),
  } as DynamicEntityDefinitionRecord;
}

export function planIndexesFromDefinitionRecords(
  records: readonly EntityDefinitionRecord[],
): TenantIndexPlan {
  const entities = records.flatMap((record) => {
    try {
      return [defineEntityFromRecord(toMutableDefinitionRecord(record))];
    } catch {
      return [];
    }
  });
  return planIndexesForTenant(entities);
}

function isFieldIndexContributionQueryable(
  field: FieldDefinitionInput,
): boolean {
  if (field.sensitive) {
    return false;
  }
  if (field.type === "image" || field.type === "document") {
    return false;
  }
  if (!field.name.trim()) {
    return false;
  }
  if (field.type === "relation") {
    const relationType = field.relation?.type;
    return relationType === "many-to-one" || relationType === "one-to-one";
  }
  return true;
}

export function computeFieldIndexContribution(
  input: PlanEntityIndexesInput,
  fieldIndex: number,
): number | null {
  const field = input.fields[fieldIndex];
  if (!field || !isFieldIndexContributionQueryable(field)) {
    return null;
  }

  const base = planEntityIndexesFromDraft(input);
  if (!base) {
    return null;
  }

  const fieldsWithFlagsOff = input.fields.map((current, index) =>
    index === fieldIndex
      ? {
          ...current,
          ui: { ...current.ui, filterable: false, sortable: false },
        }
      : current,
  );

  const reduced = planEntityIndexesFromDraft({
    ...input,
    fields: fieldsWithFlagsOff,
  });

  if (!reduced) {
    return null;
  }

  return base.summary.total - reduced.summary.total;
}

export function formatFieldIndexContribution(
  contribution: number | null,
): string {
  if (contribution === null) {
    return "—";
  }
  if (contribution === 0) {
    return "0";
  }
  return `+${contribution}`;
}
