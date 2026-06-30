import type { ReactNode } from "react";
import type { NavigateFunction } from "react-router";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { ComponentClickAction } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import type { RelationDefinitionLookup } from "../../components/entity/resolve-relation-field-path";
import {
  resolveComponentClickTarget,
  type ResolvedComponentClickTarget,
} from "./resolve-component-click-target.js";
import { wrapComponentClickTarget } from "./wrap-component-click-target.js";

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
    ) => wrapComponentClickTarget(target, children),
    navigateComponentClick: options.navigate
      ? (target) => {
          if (target.external || target.openInNewTab) {
            window.open(
              target.href,
              target.openInNewTab ? "_blank" : "_self",
              "noopener,noreferrer",
            );
            return;
          }

          options.navigate!(target.href, { state: target.state });
        }
      : undefined,
  };
}
