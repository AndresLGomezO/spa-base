import type { DataSource } from "./component.js";

export type EntityNavigationTarget =
  | { readonly scope: "current" }
  | { readonly scope: "relation"; readonly relationFieldPath: string }
  | { readonly scope: "entity"; readonly entityName: string };

export type EntityViewKind = "recordDetail" | "recordEditForm" | "entityList";

export type EntityFormPrefillSource =
  | { readonly type: "field"; readonly path: string }
  | { readonly type: "currentDate" }
  | { readonly type: "enumValue"; readonly value: string };

export type EntityFormPrefillMapping = {
  readonly targetField: string;
  readonly source: EntityFormPrefillSource;
  readonly fallback?: EntityFormPrefillSource;
};

export type ComponentClickAction =
  | {
      readonly type: "entityRecord";
      /** "current" = list/card row record; relation path = FK or dotted path (e.g. contactId, contact.name) */
      readonly target: "current" | { readonly relationFieldPath: string };
    }
  | {
      readonly type: "entityView";
      readonly view: EntityViewKind;
      readonly target: EntityNavigationTarget;
      readonly formDesignId?: string;
    }
  | {
      readonly type: "entityCreateForm";
      readonly target: EntityNavigationTarget;
      readonly prefill?: readonly EntityFormPrefillMapping[];
      readonly formDesignId?: string;
    }
  | {
      readonly type: "externalUrl";
      readonly url: DataSource;
      readonly openInNewTab?: boolean;
    };

export function isEntityNavigationTargetCurrent(
  target: EntityNavigationTarget,
): boolean {
  return target.scope === "current";
}

export function readEntityNavigationRelationFieldPath(
  target: EntityNavigationTarget,
): string | undefined {
  if (target.scope !== "relation") {
    return undefined;
  }

  return target.relationFieldPath;
}

export function readEntityNavigationEntityName(
  target: EntityNavigationTarget,
): string | undefined {
  if (target.scope !== "entity") {
    return undefined;
  }

  return target.entityName;
}

export type ResolvedComponentClickTarget =
  | {
      readonly kind: "link";
      readonly href: string;
      readonly external: boolean;
      readonly openInNewTab?: boolean;
      readonly state?: unknown;
    }
  | {
      readonly kind: "entityFormModal";
      readonly entityName: string;
      readonly mode: "create" | "edit";
      readonly recordId?: string;
      readonly createPrefill?: Readonly<Record<string, string>>;
      readonly createPrefillPopulated?: Readonly<
        Record<string, Record<string, unknown> | null>
      >;
      readonly formDesignId?: string;
    };

/** Converts legacy entityRecord actions to entityView recordDetail. */
export function normalizeEntityClickAction(
  action: ComponentClickAction,
): ComponentClickAction {
  if (action.type !== "entityRecord") {
    return action;
  }

  if (action.target === "current") {
    return {
      type: "entityView",
      view: "recordDetail",
      target: { scope: "current" },
    };
  }

  return {
    type: "entityView",
    view: "recordDetail",
    target: {
      scope: "relation",
      relationFieldPath: action.target.relationFieldPath,
    },
  };
}
