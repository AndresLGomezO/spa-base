import { z } from "zod";

export const AUDIT_LOG_COLLECTION = "_audit" as const;

export const auditLogRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  action: z.string().trim().min(1),
  entity: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  targetUserId: z.string().trim().min(1).optional(),
  permission: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().trim().min(1),
});
export type AuditLogRecord = z.infer<typeof auditLogRecordSchema>;
