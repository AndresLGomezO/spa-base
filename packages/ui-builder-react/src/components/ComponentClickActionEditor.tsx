import type { SerializableEntityDefinition } from "@repo/entities";
import { listFormDesignOptions } from "@repo/entities";
import {
  type ComponentClickAction,
  type DataSource,
  type EntityFormPrefillMapping,
  type EntityNavigationTarget,
  type EntityViewKind,
} from "@repo/ui-builder-core";
import { Checkbox, FieldLabel, Input, Select, Text } from "@repo/ui";
import { useEffect } from "react";

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
  readonly formDesign: string;
  readonly formDesignDefault: string;
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

export function resolveDefaultEntityNavigation(options: {
  readonly showCurrentRecordTarget: boolean;
  readonly showListTargets: boolean;
  readonly suggestedListEntityName?: string;
  readonly catalogEntityNames: readonly string[];
  readonly relationFieldPaths: readonly string[];
}): {
  readonly destination: NavigationDestination;
  readonly scope: TargetScopeMode;
  readonly relationFieldPath: string;
  readonly entityName: string;
} {
  const firstEntityName =
    options.suggestedListEntityName?.trim() ||
    options.catalogEntityNames[0] ||
    "";
  const firstRelationPath = options.relationFieldPaths[0] ?? "";

  if (options.showListTargets && firstEntityName) {
    return {
      destination: "entityList",
      scope: "entity",
      relationFieldPath: firstRelationPath,
      entityName: firstEntityName,
    };
  }

  if (options.showCurrentRecordTarget) {
    return {
      destination: "recordDetail",
      scope: "current",
      relationFieldPath: firstRelationPath,
      entityName: firstEntityName,
    };
  }

  if (firstRelationPath) {
    return {
      destination: "recordDetail",
      scope: "relation",
      relationFieldPath: firstRelationPath,
      entityName: firstEntityName,
    };
  }

  return {
    destination: firstEntityName ? "entityList" : "recordDetail",
    scope: "entity",
    relationFieldPath: "",
    entityName: firstEntityName,
  };
}

function coerceNavigationScope(
  scopeMode: TargetScopeMode,
  relationFieldPath: string,
  entityName: string,
  options: {
    readonly showCurrentRecordTarget: boolean;
    readonly relationFieldPaths: readonly string[];
  },
): {
  readonly scope: TargetScopeMode;
  readonly relationFieldPath: string;
  readonly entityName: string;
} {
  if (scopeMode === "current") {
    return { scope: "current", relationFieldPath, entityName };
  }

  if (scopeMode === "entity") {
    return { scope: "entity", relationFieldPath, entityName };
  }

  const trimmedRelation = relationFieldPath.trim();
  if (
    trimmedRelation &&
    (options.relationFieldPaths.length === 0 ||
      options.relationFieldPaths.includes(trimmedRelation))
  ) {
    return {
      scope: "relation",
      relationFieldPath: trimmedRelation,
      entityName,
    };
  }

  const fallbackRelation = options.relationFieldPaths[0] ?? "";
  if (fallbackRelation) {
    return {
      scope: "relation",
      relationFieldPath: fallbackRelation,
      entityName,
    };
  }

  if (entityName.trim()) {
    return { scope: "entity", relationFieldPath: "", entityName };
  }

  if (options.showCurrentRecordTarget) {
    return { scope: "current", relationFieldPath: "", entityName };
  }

  return { scope: "entity", relationFieldPath: "", entityName };
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

function readFormDesignId(clickAction?: ComponentClickAction): string {
  if (clickAction?.type === "entityCreateForm") {
    return clickAction.formDesignId ?? "";
  }

  if (
    clickAction?.type === "entityView" &&
    clickAction.view === "recordEditForm"
  ) {
    return clickAction.formDesignId ?? "";
  }

  return "";
}

function buildEntityNavigationAction(
  destination: NavigationDestination,
  target: EntityNavigationTarget,
  options?: {
    readonly prefill?: readonly EntityFormPrefillMapping[];
    readonly formDesignId?: string;
  },
): ComponentClickAction {
  const formDesignId = options?.formDesignId?.trim();
  const formDesignField = formDesignId ? { formDesignId } : {};

  if (destination === "createForm") {
    return {
      type: "entityCreateForm",
      target,
      ...formDesignField,
      ...(options?.prefill && options.prefill.length > 0
        ? { prefill: options.prefill }
        : {}),
    };
  }

  const view: EntityViewKind =
    destination === "recordEditForm"
      ? "recordEditForm"
      : destination === "entityList"
        ? "entityList"
        : "recordDetail";

  return {
    type: "entityView",
    view,
    target,
    ...(destination === "recordEditForm" ? formDesignField : {}),
  };
}

/** Rewrites empty relation targets to a valid scope when possible. */
export function sanitizeComponentClickAction(
  clickAction: ComponentClickAction | undefined,
  options: {
    readonly showCurrentRecordTarget?: boolean;
    readonly relationFieldPaths?: readonly string[];
    readonly fallbackEntityName?: string;
  } = {},
): ComponentClickAction | undefined {
  if (!clickAction) {
    return undefined;
  }

  if (clickAction.type === "externalUrl") {
    return clickAction;
  }

  if (clickAction.type === "entityRecord") {
    if (clickAction.target === "current") {
      return clickAction;
    }
    if (clickAction.target.relationFieldPath.trim()) {
      return clickAction;
    }
    const fallbackEntity = options.fallbackEntityName?.trim() ?? "";
    if (fallbackEntity) {
      return {
        type: "entityView",
        view: "recordDetail",
        target: { scope: "entity", entityName: fallbackEntity },
      };
    }
    if (options.showCurrentRecordTarget) {
      return { type: "entityRecord", target: "current" };
    }
    return undefined;
  }

  if (clickAction.target.scope !== "relation") {
    return clickAction;
  }

  if (clickAction.target.relationFieldPath.trim()) {
    return clickAction;
  }

  const coerced = coerceNavigationScope(
    "relation",
    "",
    options.fallbackEntityName ?? "",
    {
      showCurrentRecordTarget: options.showCurrentRecordTarget ?? false,
      relationFieldPaths: options.relationFieldPaths ?? [],
    },
  );
  const target = buildNavigationTarget(
    coerced.scope,
    coerced.relationFieldPath,
    coerced.entityName,
  );

  if (
    target.scope === "entity" &&
    !("entityName" in target && target.entityName.trim())
  ) {
    return undefined;
  }

  if (clickAction.type === "entityCreateForm") {
    return {
      ...clickAction,
      target,
    };
  }

  return {
    ...clickAction,
    target,
  };
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

  const formDesignId = readFormDesignId(clickAction);
  const formDesignTargetDefinition = targetDefinition ?? definition;
  const formDesignOptions = listFormDesignOptions(formDesignTargetDefinition);
  const showFormDesignPicker =
    destination === "createForm" || destination === "recordEditForm";

  const displayScopeMode = coerceNavigationScope(
    targetScopeMode,
    relationFieldPath,
    specificEntityName,
    {
      showCurrentRecordTarget,
      relationFieldPaths: relationFields.map((field) => field.path),
    },
  ).scope;

  useEffect(() => {
    const hasEmptyRelation =
      !!clickAction &&
      ((clickAction.type === "entityRecord" &&
        clickAction.target !== "current" &&
        clickAction.target.relationFieldPath.trim().length === 0) ||
        ((clickAction.type === "entityView" ||
          clickAction.type === "entityCreateForm") &&
          clickAction.target.scope === "relation" &&
          clickAction.target.relationFieldPath.trim().length === 0));

    if (!hasEmptyRelation) {
      return;
    }

    onChange(
      sanitizeComponentClickAction(clickAction, {
        showCurrentRecordTarget,
        relationFieldPaths: relationFields.map((field) => field.path),
        fallbackEntityName:
          suggestedListEntityName ?? catalogEntities[0]?.entityName,
      }),
    );
  }, [
    catalogEntities,
    clickAction,
    onChange,
    relationFields,
    showCurrentRecordTarget,
    suggestedListEntityName,
  ]);

  const emitNavigation = (
    nextDestination: NavigationDestination,
    nextScopeMode: TargetScopeMode,
    nextRelationFieldPath: string = relationFieldPath,
    nextEntityName: string = specificEntityName,
    options?: {
      readonly clearPrefill?: boolean;
      readonly prefill?: readonly EntityFormPrefillMapping[];
      readonly formDesignId?: string;
    },
  ) => {
    const coerced = coerceNavigationScope(
      nextScopeMode,
      nextRelationFieldPath,
      nextEntityName,
      {
        showCurrentRecordTarget,
        relationFieldPaths: relationFields.map((field) => field.path),
      },
    );
    const target = buildNavigationTarget(
      coerced.scope,
      coerced.relationFieldPath,
      coerced.entityName,
    );
    const nextFormDesignId =
      options?.formDesignId ??
      (nextDestination === "createForm" || nextDestination === "recordEditForm"
        ? formDesignId
        : undefined);

    if (nextDestination !== "createForm") {
      onChange(
        buildEntityNavigationAction(nextDestination, target, {
          formDesignId: nextFormDesignId,
        }),
      );
      return;
    }

    const keepPrefill =
      !options?.clearPrefill &&
      clickAction?.type === "entityCreateForm" &&
      targetsMatchForPrefill(clickAction.target, target);

    const prefill =
      options?.prefill ?? (keepPrefill ? clickAction.prefill : undefined);

    onChange(
      buildEntityNavigationAction(nextDestination, target, {
        prefill,
        formDesignId: nextFormDesignId,
      }),
    );
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
          searchable
          value={actionType}
          onChange={(event) => {
            const nextType = event.target.value as EditorActionType;
            if (nextType === "none") {
              onChange(undefined);
              return;
            }

            if (nextType === "entityNavigation") {
              const defaults = resolveDefaultEntityNavigation({
                showCurrentRecordTarget,
                showListTargets,
                suggestedListEntityName,
                catalogEntityNames: catalogEntities.map(
                  (entry) => entry.entityName,
                ),
                relationFieldPaths: relationFields.map((field) => field.path),
              });

              emitNavigation(
                defaults.destination,
                defaults.scope,
                defaults.relationFieldPath ||
                  readRelationFieldPath(
                    undefined,
                    boundFieldPath,
                    relationFields,
                  ),
                defaults.entityName,
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
              searchable
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
              searchable
              value={displayScopeMode}
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
              {relationFields.length > 0 ? (
                <option value="relation">{labels.entityTargetRelation}</option>
              ) : null}
              <option value="entity">{labels.entityTargetSpecific}</option>
            </Select>
          </label>

          {displayScopeMode === "relation" ? (
            relationFields.length > 0 ? (
              <label className="flex flex-col gap-1 text-sm">
                <FieldLabel className="text-muted-foreground">
                  {labels.relationFieldPath}
                </FieldLabel>
                <Select
                  searchable
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

          {displayScopeMode === "entity" && catalogEntities.length > 0 ? (
            <label className="flex flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.specificEntity}
              </FieldLabel>
              <Select
                searchable
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

          {showFormDesignPicker && formDesignOptions.length > 1 ? (
            <label className="flex flex-col gap-1 text-sm">
              <FieldLabel className="text-muted-foreground">
                {labels.formDesign}
              </FieldLabel>
              <Select
                searchable
                value={formDesignId}
                onChange={(event) => {
                  emitNavigation(
                    destination,
                    targetScopeMode,
                    relationFieldPath,
                    specificEntityName,
                    {
                      formDesignId: event.target.value || undefined,
                    },
                  );
                }}
              >
                {formDesignOptions.map((option) => (
                  <option key={option.id ?? "default"} value={option.id ?? ""}>
                    {option.id ? option.label : labels.formDesignDefault}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}

          {showCreateFormPrefill ? (
            <CreateFormPrefillEditor
              mappings={createFormPrefill}
              sourceDefinition={definition}
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
                searchable
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
