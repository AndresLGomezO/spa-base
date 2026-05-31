import { getEntity } from "@repo/entities";
import type {
  RegisteredUserRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { listTenantMembers } from "../admin/tenant-user-service.js";
import {
  createAuditLogWriter,
  createInMemoryAuditLogWriter,
  type AuditLogWriter,
} from "../audit/audit-log.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { EntityAccessConfig } from "./record-access.js";
import { createShareService, type ShareService } from "./share-service.js";

type GenericRecord = { readonly id: string; readonly tenantId: string };

export interface CrudAccessOptions {
  readonly getEntityAccessConfig: (
    tenantId: string,
    entityName: string,
  ) => EntityAccessConfig | undefined;
  readonly shareService: ShareService;
  readonly auditLog: AuditLogWriter;
}

export function createCrudAccessOptions(params: {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly entityRuntime: EntityRuntimeContext;
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly repositories?: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >;
  readonly useInMemoryAudit?: boolean;
}): CrudAccessOptions {
  const auditLog = params.useInMemoryAudit
    ? createInMemoryAuditLogWriter()
    : createAuditLogWriter(params.firebaseAdminConfig);

  const shareService = createShareService({
    auditLog,
    isTenantMember: async (tenantId, userId) => {
      const members = await listTenantMembers({
        registeredUserRepository: params.registeredUserRepository,
        tenantId,
      });
      return members.some((member) => member.uid === userId);
    },
    getRepository: (tenantId, entityName) => {
      const dynamicRepository = params.entityRuntime.getRepository(
        tenantId,
        entityName,
      );
      if (dynamicRepository) {
        return dynamicRepository as TenantScopedEntityRepository<
          GenericRecord,
          Record<string, unknown>
        >;
      }

      const staticRepository = params.repositories?.[entityName];
      return (
        (staticRepository as
          | TenantScopedEntityRepository<GenericRecord, Record<string, unknown>>
          | undefined) ?? null
      );
    },
  });

  return {
    auditLog,
    shareService,
    getEntityAccessConfig: (tenantId, entityName) => {
      const entity =
        params.entityRuntime.getEntityDefinition(entityName, tenantId) ??
        getEntity(entityName);
      return entity?.metadata.tenantWideRead
        ? { tenantWideRead: true }
        : undefined;
    },
  };
}
