import {
  mergeEntityUiOverrides,
  serializeEntityDefinition,
  type EntityUiOverrideRecord,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { getUiExtensions, mergeUiExtensions } from "@repo/modules";

import type { RequestContext } from "../auth/request-context.js";
import { resolveRequestFieldAccessMap } from "../rbac/create-field-access-resolver.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";

interface SerializeEntityCatalogEntryOptions {
  readonly entityRuntime: EntityRuntimeContext;
  readonly tenantId: string;
  readonly entityName: string;
  readonly requestCtx: RequestContext;
  readonly uiOverride?: EntityUiOverrideRecord | null;
}

export function serializeEntityCatalogEntry(
  options: SerializeEntityCatalogEntryOptions,
): SerializableEntityDefinition | null {
  const entity = options.entityRuntime.resolveEntity(
    options.entityName,
    options.tenantId,
  );
  if (!entity) {
    return null;
  }

  const permissions = new Set(options.requestCtx.permissions ?? []);
  const isSuperAdmin = options.requestCtx.isSuperAdmin === true;

  if (!isSuperAdmin && !permissions.has(`${entity.name}.read`)) {
    return null;
  }

  const definition = serializeEntityDefinition(entity);
  const extensions = getUiExtensions(entity.name);
  const businessFieldNames = Object.keys(entity.metadata.fields);
  const base =
    extensions.length === 0
      ? definition
      : {
          ...definition,
          ui: mergeUiExtensions(definition.ui, extensions),
        };
  const mergedDefinition = mergeEntityUiOverrides(
    base,
    options.uiOverride ?? undefined,
  );

  if (isSuperAdmin) {
    return mergedDefinition;
  }

  return {
    ...mergedDefinition,
    fieldAccess: resolveRequestFieldAccessMap(
      options.requestCtx,
      entity.name,
      businessFieldNames,
      "read",
    ),
  };
}
