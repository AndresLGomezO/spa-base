import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  EntityFormPrefillMapping,
  EntityFormPrefillSource,
} from "@repo/ui-builder-core";
import { Button, FieldLabel, Select, Text } from "@repo/ui";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import { listCreateFormPrefillSourceFieldDescriptors } from "../create-form-prefill-source-fields.js";

export interface CreateFormPrefillEditorLabels {
  readonly createFormPrefill: string;
  readonly createFormPrefillTargetField: string;
  readonly createFormPrefillSource: string;
  readonly createFormPrefillSourceField: string;
  readonly createFormPrefillSourceFieldValue: string;
  readonly createFormPrefillSourceCurrentDate: string;
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

function readSourceType(
  source: EntityFormPrefillSource,
): "field" | "currentDate" {
  return source.type === "currentDate" ? "currentDate" : "field";
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

  const updateSource = (index: number, source: EntityFormPrefillSource) => {
    updateMapping(index, { source });
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
        const targetMeta = targetDefinition.fields[mapping.targetField];
        const allowsCurrentDate = targetMeta?.type === "date";
        const sourceType = readSourceType(mapping.source);
        const availableTargetFields = targetFields.filter(
          (field) =>
            field.value === mapping.targetField ||
            !usedTargetFields.has(field.value),
        );

        return (
          <div
            key={`${index}-${mapping.targetField}`}
            className="flex flex-wrap gap-2"
          >
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.createFormPrefillTargetField}
              </FieldLabel>
              <Select
                value={mapping.targetField}
                onChange={(event) => {
                  const nextTargetField = event.target.value;
                  const nextMeta = targetDefinition.fields[nextTargetField];
                  const nextSource =
                    nextMeta?.type === "date" &&
                    mapping.source.type === "currentDate"
                      ? mapping.source
                      : mapping.source.type === "field"
                        ? mapping.source
                        : sourceFields[0]
                          ? {
                              type: "field" as const,
                              path: sourceFields[0].path,
                            }
                          : { type: "currentDate" as const };

                  updateMapping(index, {
                    targetField: nextTargetField,
                    source: nextSource,
                  });
                }}
              >
                {availableTargetFields.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.createFormPrefillSource}
              </FieldLabel>
              <Select
                value={sourceType}
                onChange={(event) => {
                  const nextType = event.target.value as
                    | "field"
                    | "currentDate";
                  if (nextType === "currentDate") {
                    updateSource(index, { type: "currentDate" });
                    return;
                  }

                  updateSource(index, {
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
              </Select>
            </label>

            {sourceType === "field" ? (
              <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm">
                <FieldLabel className="text-muted-foreground">
                  {labels.createFormPrefillSourceField}
                </FieldLabel>
                <Select
                  value={
                    mapping.source.type === "field" ? mapping.source.path : ""
                  }
                  onChange={(event) => {
                    updateSource(index, {
                      type: "field",
                      path: event.target.value,
                    });
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

            <Button
              type="button"
              variant="outline"
              className="self-end"
              onClick={() => {
                onChange(
                  mappings.filter((_, mappingIndex) => mappingIndex !== index),
                );
              }}
            >
              {labels.removeCreateFormPrefill}
            </Button>
          </div>
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
              source: sourceFields[0]
                ? { type: "field", path: sourceFields[0].path }
                : { type: "currentDate" },
            },
          ]);
        }}
      >
        {labels.addCreateFormPrefill}
      </Button>
    </div>
  );
}
