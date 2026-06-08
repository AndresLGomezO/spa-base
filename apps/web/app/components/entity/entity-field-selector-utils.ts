import {
  findFirstImageFieldName,
  type SerializableEntityDefinition,
} from "@repo/entities";
import type { EntityFieldSelectorComponentConfig } from "@repo/ui-builder-core";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatRecordDisplayLabel } from "./format-record-display-label";

export interface SelectorOption {
  readonly id: string;
  readonly label: string;
  readonly record?: Record<string, unknown>;
}

export function filterSelectorOptions(
  options: readonly SelectorOption[],
  query: string,
): readonly SelectorOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }

  return options.filter((option) =>
    option.label.toLowerCase().includes(normalized),
  );
}

export function resolveSelectorImageFieldPath(
  config: EntityFieldSelectorComponentConfig,
  targetDefinition: SerializableEntityDefinition | undefined,
): string | undefined {
  if (config.imageFieldPath?.trim()) {
    return config.imageFieldPath.trim();
  }

  if (!targetDefinition) {
    return undefined;
  }

  return findFirstImageFieldName(targetDefinition.fields);
}

export function mapRelationRecordsToOptions(
  records: readonly Record<string, unknown>[],
  targetDefinition: EntityCatalogEntry | undefined,
): readonly SelectorOption[] {
  return records.map((record) => ({
    id: String(record.id),
    label: formatRecordDisplayLabel(record, targetDefinition?.displayField),
    record,
  }));
}

export function mapEnumValuesToOptions(
  enumValues: readonly string[] | undefined,
): readonly SelectorOption[] {
  if (!enumValues) {
    return [];
  }

  return enumValues.map((value) => ({
    id: value,
    label: value,
  }));
}

export function normalizeSelectorValue(
  value: unknown,
  multiSelect: boolean,
): readonly string[] {
  if (multiSelect) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  return [];
}

export function toggleSelectorValue(
  currentValue: unknown,
  optionId: string,
  multiSelect: boolean,
): unknown {
  if (multiSelect) {
    const selected = new Set(normalizeSelectorValue(currentValue, true));
    if (selected.has(optionId)) {
      selected.delete(optionId);
    } else {
      selected.add(optionId);
    }
    return [...selected];
  }

  const current = normalizeSelectorValue(currentValue, false);
  if (current[0] === optionId) {
    return "";
  }
  return optionId;
}
