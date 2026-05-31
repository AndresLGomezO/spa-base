import type { RequestContext } from "../auth/request-context.js";
import {
  buildInitialOwnershipFields,
  canDeleteRecord,
  canReadRecord,
  canWriteRecord,
  enrichRecordWithAccess,
  isProtectedOwnershipField,
  type EntityAccessConfig,
  type RecordAccessContext,
} from "./record-access.js";

export function toRecordAccessContext(
  ctx: RequestContext,
): RecordAccessContext {
  return {
    userId: ctx.uid,
    permissions: ctx.permissions ?? [],
    ...(ctx.isSuperAdmin ? { isSuperAdmin: true } : {}),
  };
}

export function assertCanReadRecordOrNotFound(
  record: Record<string, unknown>,
  entityName: string,
  ctx: RequestContext,
  entityAccessConfig?: EntityAccessConfig,
): void {
  if (
    !canReadRecord(
      record,
      entityName,
      toRecordAccessContext(ctx),
      entityAccessConfig,
    )
  ) {
    throw new RecordAccessDeniedError();
  }
}

export function assertCanWriteRecordOrNotFound(
  record: Record<string, unknown>,
  entityName: string,
  ctx: RequestContext,
): void {
  if (!canWriteRecord(record, entityName, toRecordAccessContext(ctx))) {
    throw new RecordAccessDeniedError();
  }
}

export function assertCanDeleteRecordOrNotFound(
  record: Record<string, unknown>,
  entityName: string,
  ctx: RequestContext,
): void {
  if (!canDeleteRecord(record, entityName, toRecordAccessContext(ctx))) {
    throw new RecordAccessDeniedError();
  }
}

export class RecordAccessDeniedError extends Error {
  constructor() {
    super("Record not found.");
    this.name = "RecordAccessDeniedError";
  }
}

export function injectOwnershipOnCreate(
  data: Record<string, unknown>,
  ctx: RequestContext,
): Record<string, unknown> {
  return {
    ...data,
    ...buildInitialOwnershipFields(ctx.uid),
  };
}

export function stripProtectedOwnershipFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...data };
  for (const key of Object.keys(next)) {
    if (isProtectedOwnershipField(key)) {
      delete next[key];
    }
  }
  return next;
}

export function prepareRecordForResponse(
  record: Record<string, unknown>,
  entityName: string,
  ctx: RequestContext | undefined,
  entityAccessConfig?: EntityAccessConfig,
): Record<string, unknown> {
  if (!ctx) {
    return record;
  }

  return enrichRecordWithAccess(
    record,
    entityName,
    toRecordAccessContext(ctx),
    entityAccessConfig,
  );
}

export function setUpdatedBy(
  data: Record<string, unknown>,
  ctx: RequestContext,
): Record<string, unknown> {
  return {
    ...data,
    updatedBy: ctx.uid,
  };
}
