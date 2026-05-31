import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { nanoid } from "nanoid";

export interface AuditEntry {
  readonly action: string;
  readonly entity: string;
  readonly recordId: string;
  readonly actorId: string;
  readonly targetUserId?: string;
  readonly permission?: string;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: string;
}

export interface AuditLogger {
  log(tenantId: string, entry: AuditEntry): Promise<void>;
}

function createFirestoreAuditLogger(config: FirebaseAdminConfig): AuditLogger {
  return {
    async log(tenantId: string, entry: AuditEntry): Promise<void> {
      const firestore = getFirestoreAdmin(config);
      const auditRef = firestore
        .collection("tenants")
        .doc(tenantId)
        .collection("_audit")
        .doc(nanoid());

      await auditRef.set({
        ...entry,
        id: auditRef.id,
        tenantId,
      });
    },
  };
}

function createNoopAuditLogger(): AuditLogger {
  return {
    async log() {},
  };
}

export function createAuditLogger(config?: FirebaseAdminConfig): AuditLogger {
  if (!config) {
    return createNoopAuditLogger();
  }
  return createFirestoreAuditLogger(config);
}
