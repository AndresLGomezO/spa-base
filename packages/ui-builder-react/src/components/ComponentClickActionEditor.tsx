import type { SerializableEntityDefinition } from "@repo/entities";
import {
  type ComponentClickAction,
  type DataSource,
} from "@repo/ui-builder-core";
import { Checkbox, FieldLabel, Input, Select, Text } from "@repo/ui";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";

export interface ComponentClickActionEditorLabels {
  readonly title: string;
  readonly actionType: string;
  readonly none: string;
  readonly entityRecord: string;
  readonly externalUrl: string;
  readonly entityTarget: string;
  readonly entityTargetCurrent: string;
  readonly entityTargetRelation: string;
  readonly relationFieldPath: string;
  readonly externalUrlSource: string;
  readonly useFieldValue: string;
  readonly staticUrl: string;
  readonly urlFieldPlaceholder: string;
  readonly staticUrlPlaceholder: string;
  readonly openInNewTab: string;
}

export interface ComponentClickActionEditorProps {
  readonly clickAction?: ComponentClickAction;
  readonly boundFieldPath?: string;
  readonly showCurrentRecordTarget: boolean;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly definition: SerializableEntityDefinition;
  readonly onChange: (clickAction: ComponentClickAction | undefined) => void;
  readonly labels: ComponentClickActionEditorLabels;
}

type ActionType = "none" | "entityRecord" | "externalUrl";

type EntityTargetMode = "current" | "relation";

function readActionType(clickAction?: ComponentClickAction): ActionType {
  if (!clickAction) {
    return "none";
  }

  return clickAction.type;
}

function readEntityTargetMode(
  clickAction: ComponentClickAction | undefined,
): EntityTargetMode {
  if (clickAction?.type !== "entityRecord") {
    return "relation";
  }

  return clickAction.target === "current" ? "current" : "relation";
}

function listRelationNavigationFields(
  definition: SerializableEntityDefinition,
  fieldDescriptors: readonly FieldDescriptor[],
): readonly FieldDescriptor[] {
  const options = new Map<string, string>();

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one")
    ) {
      options.set(fieldName, fieldName);
    }
  }

  for (const field of fieldDescriptors) {
    const root = field.path.split(".")[0] ?? field.path;
    if (options.has(root)) {
      options.set(field.path, `${field.label} (${field.path})`);
    }
  }

  return [...options.entries()].map(([path, label]) => ({
    path,
    label,
    valueType: "string" as const,
  }));
}

function defaultRelationFieldPath(
  clickAction: ComponentClickAction | undefined,
  boundFieldPath: string | undefined,
  relationFields: readonly FieldDescriptor[],
): string {
  if (
    clickAction?.type === "entityRecord" &&
    clickAction.target !== "current"
  ) {
    return clickAction.target.relationFieldPath;
  }

  if (
    boundFieldPath &&
    relationFields.some((field) => field.path === boundFieldPath)
  ) {
    return boundFieldPath;
  }

  return relationFields[0]?.path ?? "";
}

export function ComponentClickActionEditor({
  clickAction,
  boundFieldPath,
  showCurrentRecordTarget,
  fieldDescriptors,
  definition,
  onChange,
  labels,
}: ComponentClickActionEditorProps) {
  const actionType = readActionType(clickAction);
  const relationFields = listRelationNavigationFields(
    definition,
    fieldDescriptors,
  );
  const entityTargetMode = readEntityTargetMode(clickAction);
  const relationFieldPath = defaultRelationFieldPath(
    clickAction,
    boundFieldPath,
    relationFields,
  );

  const externalUrlSource: DataSource =
    clickAction?.type === "externalUrl"
      ? clickAction.url
      : { type: "static", value: "" };
  const useStaticUrl = externalUrlSource.type === "static";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <FieldLabel className="text-muted-foreground">
          {labels.actionType}
        </FieldLabel>
        <Select
          value={actionType}
          onChange={(event) => {
            const nextType = event.target.value as ActionType;
            if (nextType === "none") {
              onChange(undefined);
              return;
            }

            if (nextType === "entityRecord") {
              onChange({
                type: "entityRecord",
                target: showCurrentRecordTarget
                  ? "current"
                  : {
                      relationFieldPath:
                        defaultRelationFieldPath(
                          undefined,
                          boundFieldPath,
                          relationFields,
                        ) ||
                        relationFields[0]?.path ||
                        "",
                    },
              });
              return;
            }

            onChange({
              type: "externalUrl",
              url: { type: "static", value: "" },
            });
          }}
        >
          <option value="none">{labels.none}</option>
          <option value="entityRecord">{labels.entityRecord}</option>
          <option value="externalUrl">{labels.externalUrl}</option>
        </Select>
      </label>

      {actionType === "entityRecord" ? (
        <>
          {showCurrentRecordTarget ? (
            <label className="flex flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.entityTarget}
              </FieldLabel>
              <Select
                value={entityTargetMode}
                onChange={(event) => {
                  const mode = event.target.value as EntityTargetMode;
                  if (mode === "current") {
                    onChange({ type: "entityRecord", target: "current" });
                    return;
                  }

                  onChange({
                    type: "entityRecord",
                    target: {
                      relationFieldPath:
                        relationFieldPath || relationFields[0]?.path || "",
                    },
                  });
                }}
              >
                <option value="current">{labels.entityTargetCurrent}</option>
                <option value="relation">{labels.entityTargetRelation}</option>
              </Select>
            </label>
          ) : null}

          {entityTargetMode === "relation" || !showCurrentRecordTarget ? (
            relationFields.length > 0 ? (
              <label className="flex flex-col gap-1 text-sm">
                <FieldLabel className="text-muted-foreground">
                  {labels.relationFieldPath}
                </FieldLabel>
                <Select
                  value={relationFieldPath}
                  onChange={(event) => {
                    onChange({
                      type: "entityRecord",
                      target: {
                        relationFieldPath: event.target.value,
                      },
                    });
                  }}
                >
                  {relationFields.map((field) => (
                    <option key={field.path} value={field.path}>
                      {field.label}
                    </option>
                  ))}
                </Select>
              </label>
            ) : (
              <Text className="text-muted-foreground text-sm">
                {labels.relationFieldPath}
              </Text>
            )
          ) : null}
        </>
      ) : null}

      {actionType === "externalUrl" ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={useStaticUrl}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange({
                    type: "externalUrl",
                    url: { type: "static", value: "" },
                    openInNewTab:
                      clickAction?.type === "externalUrl"
                        ? clickAction.openInNewTab
                        : undefined,
                  });
                  return;
                }

                onChange({
                  type: "externalUrl",
                  url: {
                    type: "field",
                    path: fieldDescriptors[0]?.path ?? "",
                  },
                  openInNewTab:
                    clickAction?.type === "externalUrl"
                      ? clickAction.openInNewTab
                      : undefined,
                });
              }}
            />
            <span>{labels.useFieldValue}</span>
          </label>

          {useStaticUrl ? (
            <label className="flex flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.staticUrl}
              </FieldLabel>
              <Input
                value={externalUrlSource.value}
                placeholder={labels.staticUrlPlaceholder}
                onChange={(event) => {
                  onChange({
                    type: "externalUrl",
                    url: { type: "static", value: event.target.value },
                    openInNewTab:
                      clickAction?.type === "externalUrl"
                        ? clickAction.openInNewTab
                        : undefined,
                  });
                }}
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.externalUrlSource}
              </FieldLabel>
              <Select
                value={externalUrlSource.path}
                onChange={(event) => {
                  onChange({
                    type: "externalUrl",
                    url: { type: "field", path: event.target.value },
                    openInNewTab:
                      clickAction?.type === "externalUrl"
                        ? clickAction.openInNewTab
                        : undefined,
                  });
                }}
              >
                {fieldDescriptors.map((field) => (
                  <option key={field.path} value={field.path}>
                    {field.label} ({field.path})
                  </option>
                ))}
              </Select>
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={
                clickAction?.type === "externalUrl"
                  ? (clickAction.openInNewTab ?? false)
                  : false
              }
              onChange={(event) => {
                if (clickAction?.type !== "externalUrl") {
                  return;
                }

                onChange({
                  ...clickAction,
                  openInNewTab: event.target.checked,
                });
              }}
            />
            <span>{labels.openInNewTab}</span>
          </label>
        </>
      ) : null}
    </div>
  );
}
