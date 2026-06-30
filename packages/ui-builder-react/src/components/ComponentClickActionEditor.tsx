import type { SerializableEntityDefinition } from "@repo/entities";
import {
  type ComponentClickAction,
  type DataSource,
  type EntityFormPrefillMapping,
  type EntityNavigationTarget,
  type EntityViewKind,
} from "@repo/ui-builder-core";
import { Checkbox, FieldLabel, Input, Select, Text } from "@repo/ui";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import {
  CreateFormPrefillEditor,
  type CreateFormPrefillEditorLabels,
} from "./CreateFormPrefillEditor.js";

export interface CatalogEntityOption {
  readonly entityName: string;
  readonly label: string;
}

export type ComponentClickActionEditorLabels = {
  readonly title: string;
  readonly actionType: string;
  readonly none: string;
  readonly entityNavigation: string;
  readonly externalUrl: string;
  readonly navigationDestination: string;
  readonly destinationRecordDetail: string;
  readonly destinationRecordEditForm: string;
  readonly destinationEntityList: string;
  readonly destinationCreateForm: string;
  readonly entityTarget: string;
  readonly entityTargetCurrent: string;
  readonly entityTargetRelation: string;
  readonly entityTargetSpecific: string;
  readonly relationFieldPath: string;
  readonly specificEntity: string;
  readonly externalUrlSource: string;
  readonly useFieldValue: string;
  readonly staticUrl: string;
  readonly urlFieldPlaceholder: string;
  readonly staticUrlPlaceholder: string;
  readonly openInNewTab: string;
  readonly noRelationFields: string;
} & CreateFormPrefillEditorLabels;

export interface ComponentClickActionEditorProps {
  readonly clickAction?: ComponentClickAction;
  readonly boundFieldPath?: string;
  readonly showCurrentRecordTarget?: boolean;
  readonly showRecordTargets?: boolean;
  readonly showListTargets?: boolean;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly definition: SerializableEntityDefinition;
  readonly catalogEntities?: readonly CatalogEntityOption[];
  readonly suggestedListEntityName?: string;
  readonly targetDefinition?: SerializableEntityDefinition;
  readonly onChange: (clickAction: ComponentClickAction | undefined) => void;
  readonly labels: ComponentClickActionEditorLabels;
}

type EditorActionType = "none" | "entityNavigation" | "externalUrl";
type NavigationDestination =
  | "recordDetail"
  | "recordEditForm"
  | "entityList"
  | "createForm";
type TargetScopeMode = "current" | "relation" | "entity";

function readEditorActionType(
  clickAction?: ComponentClickAction,
): EditorActionType {
  if (!clickAction) {
    return "none";
  }

  if (
    clickAction.type === "entityRecord" ||
    clickAction.type === "entityView" ||
    clickAction.type === "entityCreateForm"
  ) {
    return "entityNavigation";
  }

  return "externalUrl";
}

function readNavigationDestination(
  clickAction?: ComponentClickAction,
): NavigationDestination {
  if (clickAction?.type === "entityCreateForm") {
    return "createForm";
  }

  if (clickAction?.type === "entityView") {
    switch (clickAction.view) {
      case "recordEditForm":
        return "recordEditForm";
      case "entityList":
        return "entityList";
      default:
        return "recordDetail";
    }
  }

  if (clickAction?.type === "entityRecord") {
    return "recordDetail";
  }

  return "recordDetail";
}

function readTargetScopeMode(
  clickAction: ComponentClickAction | undefined,
): TargetScopeMode {
  if (clickAction?.type === "entityRecord") {
    return clickAction.target === "current" ? "current" : "relation";
  }

  if (
    clickAction?.type === "entityView" ||
    clickAction?.type === "entityCreateForm"
  ) {
    switch (clickAction.target.scope) {
      case "current":
        return "current";
      case "entity":
        return "entity";
      case "relation":
        return "relation";
    }
  }

  return "current";
}

function readRelationFieldPath(
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
    (clickAction?.type === "entityView" ||
      clickAction?.type === "entityCreateForm") &&
    clickAction.target.scope === "relation"
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

function readSpecificEntityName(
  clickAction: ComponentClickAction | undefined,
  catalogEntities: readonly CatalogEntityOption[],
  suggestedListEntityName: string | undefined,
): string {
  if (
    (clickAction?.type === "entityView" ||
      clickAction?.type === "entityCreateForm") &&
    clickAction.target.scope === "entity"
  ) {
    return clickAction.target.entityName;
  }

  if (suggestedListEntityName) {
    return suggestedListEntityName;
  }

  return catalogEntities[0]?.entityName ?? "";
}

function listRelationNavigationFields(
  definition: SerializableEntityDefinition,
  fieldDescriptors: readonly FieldDescriptor[],
): readonly FieldDescriptor[] {
  const options = new Map<string, string>();

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (!meta.relation) {
      continue;
    }

    if (
      meta.relation.type === "many-to-one" ||
      meta.relation.type === "one-to-one"
    ) {
      options.set(fieldName, fieldName);
      continue;
    }

    if (meta.relation.type === "one-to-many" && meta.relation.target) {
      options.set(fieldName, `${fieldName} → ${meta.relation.target}`);
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

function buildNavigationTarget(
  scopeMode: TargetScopeMode,
  relationFieldPath: string,
  entityName: string,
): EntityNavigationTarget {
  if (scopeMode === "current") {
    return { scope: "current" };
  }

  if (scopeMode === "entity") {
    return { scope: "entity", entityName };
  }

  return { scope: "relation", relationFieldPath };
}

function targetsMatchForPrefill(
  previous: EntityNavigationTarget,
  next: EntityNavigationTarget,
): boolean {
  if (previous.scope !== next.scope) {
    return false;
  }

  if (previous.scope === "entity" && next.scope === "entity") {
    return previous.entityName === next.entityName;
  }

  if (previous.scope === "relation" && next.scope === "relation") {
    return previous.relationFieldPath === next.relationFieldPath;
  }

  return false;
}

function buildEntityNavigationAction(
  destination: NavigationDestination,
  target: EntityNavigationTarget,
  prefill?: readonly EntityFormPrefillMapping[],
): ComponentClickAction {
  if (destination === "createForm") {
    return prefill && prefill.length > 0
      ? { type: "entityCreateForm", target, prefill }
      : { type: "entityCreateForm", target };
  }

  const view: EntityViewKind =
    destination === "recordEditForm"
      ? "recordEditForm"
      : destination === "entityList"
        ? "entityList"
        : "recordDetail";

  return { type: "entityView", view, target };
}

export function ComponentClickActionEditor({
  clickAction,
  boundFieldPath,
  showCurrentRecordTarget = false,
  showRecordTargets = true,
  showListTargets = true,
  fieldDescriptors,
  definition,
  catalogEntities = [],
  suggestedListEntityName,
  targetDefinition,
  onChange,
  labels,
}: ComponentClickActionEditorProps) {
  const actionType = readEditorActionType(clickAction);
  const relationFields = listRelationNavigationFields(
    definition,
    fieldDescriptors,
  );
  const destination = readNavigationDestination(clickAction);
  const targetScopeMode = readTargetScopeMode(clickAction);
  const relationFieldPath = readRelationFieldPath(
    clickAction,
    boundFieldPath,
    relationFields,
  );
  const specificEntityName = readSpecificEntityName(
    clickAction,
    catalogEntities,
    suggestedListEntityName,
  );

  const externalUrlSource: DataSource =
    clickAction?.type === "externalUrl"
      ? clickAction.url
      : { type: "static", value: "" };
  const useStaticUrl = externalUrlSource.type === "static";

  const showCurrentTarget =
    showCurrentRecordTarget &&
    (destination !== "createForm"
      ? destination === "entityList"
        ? showListTargets
        : showRecordTargets
      : false);

  const emitNavigation = (
    nextDestination: NavigationDestination,
    nextScopeMode: TargetScopeMode,
    nextRelationFieldPath: string = relationFieldPath,
    nextEntityName: string = specificEntityName,
    options?: {
      readonly clearPrefill?: boolean;
      readonly prefill?: readonly EntityFormPrefillMapping[];
    },
  ) => {
    const target = buildNavigationTarget(
      nextScopeMode,
      nextRelationFieldPath,
      nextEntityName,
    );

    if (nextDestination !== "createForm") {
      onChange(buildEntityNavigationAction(nextDestination, target));
      return;
    }

    const keepPrefill =
      !options?.clearPrefill &&
      clickAction?.type === "entityCreateForm" &&
      targetsMatchForPrefill(clickAction.target, target);

    const prefill =
      options?.prefill ?? (keepPrefill ? clickAction.prefill : undefined);

    onChange(buildEntityNavigationAction(nextDestination, target, prefill));
  };

  const showCreateFormPrefill =
    destination === "createForm" &&
    targetScopeMode !== "current" &&
    targetDefinition != null;

  const createFormPrefill =
    clickAction?.type === "entityCreateForm" ? (clickAction.prefill ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <FieldLabel className="text-muted-foreground">
          {labels.actionType}
        </FieldLabel>
        <Select
          value={actionType}
          onChange={(event) => {
            const nextType = event.target.value as EditorActionType;
            if (nextType === "none") {
              onChange(undefined);
              return;
            }

            if (nextType === "entityNavigation") {
              const defaultDestination: NavigationDestination =
                showListTargets && suggestedListEntityName
                  ? "entityList"
                  : "recordDetail";
              const defaultScope: TargetScopeMode =
                defaultDestination === "entityList"
                  ? "entity"
                  : showCurrentRecordTarget
                    ? "current"
                    : "relation";

              emitNavigation(
                defaultDestination,
                defaultScope,
                readRelationFieldPath(
                  undefined,
                  boundFieldPath,
                  relationFields,
                ),
                suggestedListEntityName ?? catalogEntities[0]?.entityName ?? "",
              );
              return;
            }

            onChange({
              type: "externalUrl",
              url: { type: "static", value: "" },
            });
          }}
        >
          <option value="none">{labels.none}</option>
          <option value="entityNavigation">{labels.entityNavigation}</option>
          <option value="externalUrl">{labels.externalUrl}</option>
        </Select>
      </label>

      {actionType === "entityNavigation" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <FieldLabel className="text-muted-foreground">
              {labels.navigationDestination}
            </FieldLabel>
            <Select
              value={destination}
              onChange={(event) => {
                const nextDestination = event.target
                  .value as NavigationDestination;
                let nextScope = targetScopeMode;

                if (nextDestination === "createForm") {
                  nextScope =
                    targetScopeMode === "current"
                      ? "relation"
                      : targetScopeMode;
                }

                if (
                  nextDestination === "entityList" &&
                  targetScopeMode === "current" &&
                  !showCurrentTarget
                ) {
                  nextScope = suggestedListEntityName ? "entity" : "relation";
                }

                emitNavigation(
                  nextDestination,
                  nextScope,
                  undefined,
                  undefined,
                  {
                    clearPrefill: true,
                  },
                );
              }}
            >
              {showRecordTargets ? (
                <>
                  <option value="recordDetail">
                    {labels.destinationRecordDetail}
                  </option>
                  <option value="recordEditForm">
                    {labels.destinationRecordEditForm}
                  </option>
                </>
              ) : null}
              {showListTargets ? (
                <option value="entityList">
                  {labels.destinationEntityList}
                </option>
              ) : null}
              <option value="createForm">{labels.destinationCreateForm}</option>
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <FieldLabel className="text-muted-foreground">
              {labels.entityTarget}
            </FieldLabel>
            <Select
              value={targetScopeMode}
              onChange={(event) => {
                const nextScope = event.target.value as TargetScopeMode;
                emitNavigation(destination, nextScope, undefined, undefined, {
                  clearPrefill: true,
                });
              }}
            >
              {showCurrentTarget ? (
                <option value="current">{labels.entityTargetCurrent}</option>
              ) : null}
              <option value="relation">{labels.entityTargetRelation}</option>
              <option value="entity">{labels.entityTargetSpecific}</option>
            </Select>
          </label>

          {targetScopeMode === "relation" ? (
            relationFields.length > 0 ? (
              <label className="flex flex-col gap-1 text-sm">
                <FieldLabel className="text-muted-foreground">
                  {labels.relationFieldPath}
                </FieldLabel>
                <Select
                  value={relationFieldPath}
                  onChange={(event) => {
                    emitNavigation(
                      destination,
                      "relation",
                      event.target.value,
                      undefined,
                      {
                        clearPrefill: true,
                      },
                    );
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
                {labels.noRelationFields}
              </Text>
            )
          ) : null}

          {targetScopeMode === "entity" && catalogEntities.length > 0 ? (
            <label className="flex flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.specificEntity}
              </FieldLabel>
              <Select
                value={specificEntityName}
                onChange={(event) => {
                  emitNavigation(
                    destination,
                    "entity",
                    relationFieldPath,
                    event.target.value,
                    { clearPrefill: true },
                  );
                }}
              >
                {catalogEntities.map((entry) => (
                  <option key={entry.entityName} value={entry.entityName}>
                    {entry.label} ({entry.entityName})
                  </option>
                ))}
              </Select>
            </label>
          ) : null}

          {showCreateFormPrefill ? (
            <CreateFormPrefillEditor
              mappings={createFormPrefill}
              targetDefinition={targetDefinition}
              sourceFieldDescriptors={fieldDescriptors}
              labels={labels}
              onChange={(prefill) => {
                emitNavigation(
                  destination,
                  targetScopeMode,
                  relationFieldPath,
                  specificEntityName,
                  { prefill },
                );
              }}
            />
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
