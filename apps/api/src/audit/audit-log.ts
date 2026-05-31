import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { TENANTS_COLLECTION } from "@repo/shared-types";

type AuditAction = "share_granted" | "share_revoked";

export interface AuditLogEntry {
  readonly action: AuditAction;
  readonly entity: string;
  readonly recordId: string;
  readonly actorId: string;
  readonly targetUserId: string;
  readonly permission?: "read" | "write";
  readonly timestamp: string;
}

export interface AuditLogWriter {
  write(tenantId: string, entry: AuditLogEntry): Promise<void>;
}

export function createAuditLogWriter(
  config: FirebaseAdminConfig,
): AuditLogWriter {
  return {
    async write(tenantId, entry) {
      const firestore = getFirestoreAdmin(config);
      const docRef = firestore
        .collection(TENANTS_COLLECTION)
        .doc(tenantId)
        .collection("_audit")
        .doc(nanoid());

      await docRef.set(entry);
    },
  };
}

export function createInMemoryAuditLogWriter(
  store: AuditLogEntry[] = [],
): AuditLogWriter & { readonly entries: AuditLogEntry[] } {
  const entries = store;
  return {
    entries,
    async write(_tenantId, entry) {
      entries.push(entry);
    },
  };
}
