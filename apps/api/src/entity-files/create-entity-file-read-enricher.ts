import type { FastifyRequest } from "fastify";

import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { enrichRecordsFileFieldsForRead } from "./entity-file-field-utils.js";

export interface RecordReadEnrichContext {
  readonly entityName: string;
  readonly tenantId: string;
  readonly request: FastifyRequest;
}

export type RecordReadEnricher = (
  records: readonly Record<string, unknown>[],
  context: RecordReadEnrichContext,
) => Promise<Record<string, unknown>[]>;

export function createEntityFileReadEnricher(
  firebaseAdminConfig: FirebaseAdminConfig,
  entityRuntime: EntityRuntimeContext,
): RecordReadEnricher {
  return async (records, { entityName, tenantId }) => {
    const entity = entityRuntime.getEntityDefinition(entityName, tenantId);
    if (!entity) {
      return [...records];
    }

    return enrichRecordsFileFieldsForRead(firebaseAdminConfig, entity, records);
  };
}
