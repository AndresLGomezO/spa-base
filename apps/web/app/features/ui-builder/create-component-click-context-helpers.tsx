import { createElement, type ReactNode } from "react";
import type { NavigateFunction } from "react-router";
import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  ComponentClickAction,
  ResolvedComponentClickTarget,
} from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";

import type { EntityFormModalRequest } from "../../components/entity/entity-form-modal-context";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import type { RelationDefinitionLookup } from "../../components/entity/resolve-relation-field-path";
import { ComponentClickTargetWrapper } from "./ComponentClickTargetWrapper.js";
import { handleComponentClickTarget } from "./handle-component-click-target.js";
import { resolveComponentClickTarget } from "./resolve-component-click-target.js";

export function createComponentClickContextHelpers(options: {
  readonly item: Record<string, unknown>;
  readonly entityName: string;
  readonly definition: SerializableEntityDefinition;
  readonly resolveField: (path: string) => unknown;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly returnTo?: string;
  readonly navigate?: NavigateFunction;
  readonly openEntityFormModal?: (request: EntityFormModalRequest) => void;
  readonly navigateComponentClick?: (
    target: ResolvedComponentClickTarget,
  ) => void;
}): Pick<
  LayoutRenderContext,
  | "resolveComponentClickTarget"
  | "componentClickWrapper"
  | "navigateComponentClick"
> {
  const getDefinition: RelationDefinitionLookup | undefined =
    options.getDefinition
      ? (entityName) => options.getDefinition?.(entityName)
      : undefined;

  const resolverOptions = {
    item: options.item,
    entityName: options.entityName,
    definition: options.definition,
    resolveField: options.resolveField,
    getDefinition,
    returnTo: options.returnTo,
  };

  const navigateComponentClick =
    options.navigateComponentClick ??
    (options.navigate || options.openEntityFormModal
      ? (target: ResolvedComponentClickTarget) => {
          handleComponentClickTarget(target, {
            navigate: options.navigate,
            openEntityFormModal: options.openEntityFormModal,
          });
        }
      : undefined);

  return {
    resolveComponentClickTarget: (
      action: ComponentClickAction,
      hints?: { readonly boundFieldPath?: string },
    ): ResolvedComponentClickTarget | null =>
      resolveComponentClickTarget({
        ...resolverOptions,
        action,
        hints,
      }),
    componentClickWrapper: (
      target: ResolvedComponentClickTarget,
      children: ReactNode,
    ) =>
      createElement(ComponentClickTargetWrapper, {
        target,
        children,
      }),
    navigateComponentClick,
  };
}
