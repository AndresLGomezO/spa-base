import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";
import type { DataHookExecutionRepository } from "@repo/firestore-converters";
import type { HookLogMessageRepository } from "@repo/firestore-converters";
import type { UserNotificationRepository } from "@repo/firestore-converters";

import type { DataHookJobPayload } from "@repo/hooks";
import type { DataHookWebhookRequest } from "@repo/hooks";

import type { AggregationEmitterDeps } from "../aggregation/emit-aggregation-event.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { FormulaRuntimeContext } from "../formulas/formula-runtime-context.js";
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
  readonly formulaRuntime: FormulaRuntimeContext;
  readonly entityRuntime: EntityRuntimeForCrudHooks;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly hookExecutionRepository?: DataHookExecutionRepository;
  readonly hookLogMessageRepository?: HookLogMessageRepository;
  readonly userNotificationRepository?: UserNotificationRepository;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
  readonly callWebhook?: (request: DataHookWebhookRequest) => Promise<void>;
  readonly aggregation?: AggregationEmitterDeps;
}
