import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  EntityFormPrefillMapping,
  EntityFormPrefillSource,
} from "@repo/ui-builder-core";
import { Button, Checkbox, FieldLabel, Select, Text } from "@repo/ui";
import { useEffect, useState } from "react";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import { listCreateFormPrefillSourceFieldDescriptors } from "../create-form-prefill-source-fields.js";
import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";

export interface CreateFormPrefillEditorLabels {
  readonly createFormPrefill: string;
  readonly createFormPrefillTargetField: string;
  readonly createFormPrefillSource: string;
  readonly createFormPrefillPrimarySource: string;
  readonly createFormPrefillFallbackSource: string;
  readonly createFormPrefillUseFallback: string;
  readonly createFormPrefillSourceField: string;
  readonly createFormPrefillSourceFieldValue: string;
  readonly createFormPrefillSourceCurrentDate: string;
  readonly createFormPrefillSourceEnumValue: string;
  readonly createFormPrefillEnumValue: string;
  readonly addCreateFormPrefill: string;
  readonly removeCreateFormPrefill: string;
  readonly noCreateFormPrefillTargetFields: string;
}

export interface CreateFormPrefillEditorProps {
  readonly mappings: readonly EntityFormPrefillMapping[];
  readonly sourceDefinition: SerializableEntityDefinition;
  readonly targetDefinition: SerializableEntityDefinition;
  readonly sourceFieldDescriptors: readonly FieldDescriptor[];
  readonly onChange: (mappings: readonly EntityFormPrefillMapping[]) => void;
  readonly labels: CreateFormPrefillEditorLabels;
}

type PrefillSourceKind = "field" | "currentDate" | "enumValue";

function isCreateFormPrefillTargetFieldEligible(
  fieldName: string,
  definition: SerializableEntityDefinition,
): boolean {
  if (fieldName.includes(".")) {
    return false;
  }

  const meta = definition.fields[fieldName];
  if (!meta) {
    return false;
  }

  if (
    meta.type === "string" ||
    meta.type === "number" ||
    meta.type === "boolean" ||
    meta.type === "enum" ||
    meta.type === "date"
  ) {
    return true;
  }

  if (meta.type === "relation" && meta.relation) {
    return (
      meta.relation.type === "many-to-one" ||
      meta.relation.type === "one-to-one"
    );
  }

  return false;
}

function listTargetFieldOptions(
  definition: SerializableEntityDefinition,
): readonly { readonly value: string; readonly label: string }[] {
  return Object.entries(definition.fields)
    .filter(([fieldName]) =>
      isCreateFormPrefillTargetFieldEligible(fieldName, definition),
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fieldName]) => ({
      value: fieldName,
      label: fieldName,
    }));
}

function readSourceType(source: EntityFormPrefillSource): PrefillSourceKind {
  if (source.type === "currentDate") {
    return "currentDate";
  }

  if (source.type === "enumValue") {
    return "enumValue";
  }

  return "field";
}

function readTargetEnumValues(
  targetDefinition: SerializableEntityDefinition,
  targetField: string,
): readonly string[] {
  const meta = targetDefinition.fields[targetField];
  if (meta?.type !== "enum") {
    return [];
  }

  return meta.enumValues ?? [];
}

function resolveSourceForTargetField(
  targetField: string,
  currentSource: EntityFormPrefillSource,
  sourceFields: readonly FieldDescriptor[],
  targetDefinition: SerializableEntityDefinition,
): EntityFormPrefillSource {
  const meta = targetDefinition.fields[targetField];

  if (currentSource.type === "currentDate" && meta?.type === "date") {
    return currentSource;
  }

  if (currentSource.type === "enumValue" && meta?.type === "enum") {
    const enumValues = readTargetEnumValues(targetDefinition, targetField);
    if (enumValues.includes(currentSource.value)) {
      return currentSource;
    }

    const firstValue = enumValues[0];
    if (firstValue) {
      return { type: "enumValue", value: firstValue };
    }
  }

  if (currentSource.type === "field") {
    return currentSource;
  }

  if (meta?.type === "date") {
    return { type: "currentDate" };
  }

  const firstEnumValue = readTargetEnumValues(targetDefinition, targetField)[0];
  if (meta?.type === "enum" && firstEnumValue) {
    return { type: "enumValue", value: firstEnumValue };
  }

  return sourceFields[0]
    ? { type: "field", path: sourceFields[0].path }
    : { type: "currentDate" };
}

function resolveMappingForTargetField(
  mapping: EntityFormPrefillMapping,
  nextTargetField: string,
  sourceFields: readonly FieldDescriptor[],
  targetDefinition: SerializableEntityDefinition,
): EntityFormPrefillMapping {
  const next: EntityFormPrefillMapping = {
    targetField: nextTargetField,
    source: resolveSourceForTargetField(
      nextTargetField,
      mapping.source,
      sourceFields,
      targetDefinition,
    ),
  };

  if (mapping.fallback) {
    return {
      ...next,
      fallback: resolveSourceForTargetField(
        nextTargetField,
        mapping.fallback,
        sourceFields,
        targetDefinition,
      ),
    };
  }

  return next;
}

function resolveDefaultSourceForTargetField(
  targetField: string,
  sourceFields: readonly FieldDescriptor[],
  targetDefinition: SerializableEntityDefinition,
): EntityFormPrefillSource {
  return resolveSourceForTargetField(
    targetField,
    { type: "field", path: sourceFields[0]?.path ?? "" },
    sourceFields,
    targetDefinition,
  );
}

function resolveDefaultFallbackSource(
  targetField: string,
  primarySource: EntityFormPrefillSource,
  sourceFields: readonly FieldDescriptor[],
  targetDefinition: SerializableEntityDefinition,
): EntityFormPrefillSource {
  const meta = targetDefinition.fields[targetField];

  if (meta?.type === "enum") {
    const enumValues = readTargetEnumValues(targetDefinition, targetField);
    const fallbackValue = enumValues.find(
      (value) =>
        primarySource.type !== "enumValue" || primarySource.value !== value,
    );
    if (fallbackValue) {
      return { type: "enumValue", value: fallbackValue };
    }
  }

  const alternateField = sourceFields.find(
    (field) =>
      primarySource.type !== "field" || primarySource.path !== field.path,
  );
  if (alternateField) {
    return { type: "field", path: alternateField.path };
  }

  return resolveDefaultSourceForTargetField(
    targetField,
    sourceFields,
    targetDefinition,
  );
}

function formatMappingTitle(
  targetDefinition: SerializableEntityDefinition,
  targetField: string,
): string {
  return (
    targetDefinition.ui.fields?.[targetField]?.label?.trim() || targetField
  );
}

interface PrefillSourceFieldsProps {
  readonly source: EntityFormPrefillSource;
  readonly targetField: string;
  readonly targetDefinition: SerializableEntityDefinition;
  readonly sourceFields: readonly FieldDescriptor[];
  readonly labels: CreateFormPrefillEditorLabels;
  readonly sectionLabel: string;
  readonly onChange: (source: EntityFormPrefillSource) => void;
}

function PrefillSourceFields({
  source,
  targetField,
  targetDefinition,
  sourceFields,
  labels,
  sectionLabel,
  onChange,
}: PrefillSourceFieldsProps) {
  const targetMeta = targetDefinition.fields[targetField];
  const allowsCurrentDate = targetMeta?.type === "date";
  const allowsEnumValue = targetMeta?.type === "enum";
  const enumValues = readTargetEnumValues(targetDefinition, targetField);
  const sourceType = readSourceType(source);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-2">
      <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {sectionLabel}
      </Text>

      <label className="flex flex-col gap-1 text-sm">
        <FieldLabel className="text-muted-foreground">
          {labels.createFormPrefillSource}
        </FieldLabel>
        <Select
          value={sourceType}
          onChange={(event) => {
            const nextType = event.target.value as PrefillSourceKind;
            if (nextType === "currentDate") {
              onChange({ type: "currentDate" });
              return;
            }

            if (nextType === "enumValue") {
              onChange({ type: "enumValue", value: enumValues[0] ?? "" });
              return;
            }

            onChange({
              type: "field",
              path: sourceFields[0]?.path ?? "",
            });
          }}
        >
          <option value="field">
            {labels.createFormPrefillSourceFieldValue}
          </option>
          {allowsCurrentDate ? (
            <option value="currentDate">
              {labels.createFormPrefillSourceCurrentDate}
            </option>
          ) : null}
          {allowsEnumValue && enumValues.length > 0 ? (
            <option value="enumValue">
              {labels.createFormPrefillSourceEnumValue}
            </option>
          ) : null}
        </Select>
      </label>

      {sourceType === "field" ? (
        <label className="flex flex-col gap-1 text-sm">
          <FieldLabel className="text-muted-foreground">
            {labels.createFormPrefillSourceField}
          </FieldLabel>
          <Select
            value={source.type === "field" ? source.path : ""}
            onChange={(event) => {
              onChange({ type: "field", path: event.target.value });
            }}
          >
            {sourceFields.map((field) => (
              <option key={field.path} value={field.path}>
                {field.label} ({field.path})
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      {sourceType === "enumValue" ? (
        <label className="flex flex-col gap-1 text-sm">
          <FieldLabel className="text-muted-foreground">
            {labels.createFormPrefillEnumValue}
          </FieldLabel>
          <Select
            value={source.type === "enumValue" ? source.value : ""}
            onChange={(event) => {
              onChange({ type: "enumValue", value: event.target.value });
            }}
          >
            {enumValues.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
    </div>
  );
}

export function CreateFormPrefillEditor({
  mappings,
  sourceDefinition,
  targetDefinition,
  sourceFieldDescriptors,
  onChange,
  labels,
}: CreateFormPrefillEditorProps) {
  const sourceFields = listCreateFormPrefillSourceFieldDescriptors(
    sourceDefinition,
    sourceFieldDescriptors,
  );
  const targetFields = listTargetFieldOptions(targetDefinition);
  const usedTargetFields = new Set(
    mappings.map((mapping) => mapping.targetField),
  );
  const [openIndices, setOpenIndices] = useState<ReadonlySet<number>>(
    () => new Set(mappings.length === 1 ? [0] : []),
  );

  useEffect(() => {
    setOpenIndices((current) => {
      const next = new Set<number>();
      for (const index of current) {
        if (index < mappings.length) {
          next.add(index);
        }
      }
      return next;
    });
  }, [mappings.length]);

  const updateMapping = (
    index: number,
    patch: Partial<EntityFormPrefillMapping>,
  ) => {
    onChange(
      mappings.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, ...patch } : mapping,
      ),
    );
  };

  const setMappingOpen = (index: number, open: boolean) => {
    setOpenIndices((current) => {
      const next = new Set(current);
      if (open) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  if (targetFields.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {labels.noCreateFormPrefillTargetFields}
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Text className="text-muted-foreground text-sm">
        {labels.createFormPrefill}
      </Text>

      {mappings.map((mapping, index) => {
        const availableTargetFields = targetFields.filter(
          (field) =>
            field.value === mapping.targetField ||
            !usedTargetFields.has(field.value),
        );

        return (
          <CollapsibleEditorCard
            key={`${index}-${mapping.targetField}`}
            title={formatMappingTitle(targetDefinition, mapping.targetField)}
            open={openIndices.has(index)}
            onOpenChange={(open) => setMappingOpen(index, open)}
            headerEnd={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange(
                    mappings.filter(
                      (_, mappingIndex) => mappingIndex !== index,
                    ),
                  );
                }}
              >
                {labels.removeCreateFormPrefill}
              </Button>
            }
          >
            <label className="flex flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.createFormPrefillTargetField}
              </FieldLabel>
              <Select
                value={mapping.targetField}
                onChange={(event) => {
                  updateMapping(
                    index,
                    resolveMappingForTargetField(
                      mapping,
                      event.target.value,
                      sourceFields,
                      targetDefinition,
                    ),
                  );
                }}
              >
                {availableTargetFields.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </Select>
            </label>

            <PrefillSourceFields
              source={mapping.source}
              targetField={mapping.targetField}
              targetDefinition={targetDefinition}
              sourceFields={sourceFields}
              labels={labels}
              sectionLabel={labels.createFormPrefillPrimarySource}
              onChange={(source) => updateMapping(index, { source })}
            />

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={mapping.fallback != null}
                onChange={(event) => {
                  if (event.target.checked) {
                    updateMapping(index, {
                      fallback: resolveDefaultFallbackSource(
                        mapping.targetField,
                        mapping.source,
                        sourceFields,
                        targetDefinition,
                      ),
                    });
                    return;
                  }

                  updateMapping(index, { fallback: undefined });
                }}
              />
              <span>{labels.createFormPrefillUseFallback}</span>
            </label>

            {mapping.fallback ? (
              <PrefillSourceFields
                source={mapping.fallback}
                targetField={mapping.targetField}
                targetDefinition={targetDefinition}
                sourceFields={sourceFields}
                labels={labels}
                sectionLabel={labels.createFormPrefillFallbackSource}
                onChange={(fallback) => updateMapping(index, { fallback })}
              />
            ) : null}
          </CollapsibleEditorCard>
        );
      })}

      <Button
        type="button"
        variant="outline"
        disabled={
          targetFields.length === 0 || mappings.length >= targetFields.length
        }
        onClick={() => {
          const nextTarget = targetFields.find(
            (field) => !usedTargetFields.has(field.value),
          );
          if (!nextTarget) {
            return;
          }

          onChange([
            ...mappings,
            {
              targetField: nextTarget.value,
              source: resolveDefaultSourceForTargetField(
                nextTarget.value,
                sourceFields,
                targetDefinition,
              ),
            },
          ]);
          setOpenIndices((current) => new Set([...current, mappings.length]));
        }}
      >
        {labels.addCreateFormPrefill}
      </Button>
    </div>
  );
}
