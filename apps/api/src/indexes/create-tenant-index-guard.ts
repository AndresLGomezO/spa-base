import type { IndexProvisionBlockedOperation } from "@repo/debug-logs";
import type { FirestoreIndexStatusStore } from "@repo/gcp-firebase";
import type { FastifyReply } from "fastify";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import {
  assertTenantIndexesReady,
  mapIndexGuardError,
  type IndexProvisionEventWriter,
} from "./index-query-guard.js";

interface TenantIndexGuardDeps {
  readonly statusStore?: FirestoreIndexStatusStore;
  readonly entityRuntime: EntityRuntimeContext;
  readonly recordEvent?: IndexProvisionEventWriter;
}

export function createTenantIndexGuard(deps: TenantIndexGuardDeps) {
  return {
    async assertEnvironmentReady(
      tenantId: string,
      blockedOperation: IndexProvisionBlockedOperation,
    ): Promise<void> {
      await assertTenantIndexesReady(
        deps.statusStore,
        deps.entityRuntime,
        tenantId,
        {
          blockedOperation,
          tenantId,
          recordEvent: deps.recordEvent,
        },
      );
    },
    mapError(reply: FastifyReply, error: unknown): boolean {
      return mapIndexGuardError(reply, error);
    },
  };
}

export type TenantIndexGuard = ReturnType<typeof createTenantIndexGuard>;
