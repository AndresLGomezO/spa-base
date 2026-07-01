import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";

import type { DataHookJobPayload } from "@repo/hooks";

import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { HookRuntimeContext } from "./hook-runtime-context.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type GenericRecord = { readonly id: string; readonly tenantId: string };

export interface EntityRuntimeForCrudHooks {
  resolveEntity(name: string, tenantId: string): AnyDefinedEntity | undefined;
  getRepository(
    tenantId: string,
    entityName: string,
  ): TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
}

export interface CrudHookDeps {
  readonly hookRuntime: HookRuntimeContext;
  readonly entityRuntime: EntityRuntimeForCrudHooks;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
}
