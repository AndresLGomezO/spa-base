import {
  FieldValue,
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import type { AuditLogger } from "../audit/audit-log.js";
import { checkRecordAccess } from "./record-access.js";

export type SharePermission = "read" | "write";

export interface ShareRecord {
  readonly userId: string;
  readonly permission: SharePermission;
}

interface ShareServiceDeps {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly auditLogger: AuditLogger;
}

export interface ShareService {
  grantShare(params: {
    tenantId: string;
    collection: string;
    entityName: string;
    recordId: string;
    callerUserId: string;
    callerPermissions: readonly string[];
    callerIsSuperAdmin?: boolean;
    targetUserId: string;
    permission: SharePermission;
  }): Promise<void>;

  revokeShare(params: {
    tenantId: string;
    collection: string;
    entityName: string;
    recordId: string;
    callerUserId: string;
    callerPermissions: readonly string[];
    callerIsSuperAdmin?: boolean;
    targetUserId: string;
  }): Promise<void>;

  listShares(params: {
    tenantId: string;
    collection: string;
    entityName: string;
    recordId: string;
    callerUserId: string;
    callerPermissions: readonly string[];
    callerIsSuperAdmin?: boolean;
  }): Promise<readonly ShareRecord[]>;
}

export class ShareAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShareAccessError";
  }
}

export function createShareService(deps: ShareServiceDeps): ShareService {
  const firestore = getFirestoreAdmin(deps.firebaseAdminConfig);

  function getDocRef(tenantId: string, collection: string, recordId: string) {
    return firestore
      .collection("tenants")
      .doc(tenantId)
      .collection(collection)
      .doc(recordId);
  }

  return {
    async grantShare(params) {
      const docRef = getDocRef(
        params.tenantId,
        params.collection,
        params.recordId,
      );

      await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
          throw new ShareAccessError("Record not found.");
        }

        const data = doc.data() as Record<string, unknown>;
        const access = checkRecordAccess(
          data,
          params.callerUserId,
          params.callerPermissions,
          params.entityName,
          params.callerIsSuperAdmin,
        );

        if (!access.isOwner && !params.callerIsSuperAdmin) {
          const hasManageShares = params.callerPermissions.includes(
            `${params.entityName}.manage_shares`,
          );
          if (!hasManageShares) {
            throw new ShareAccessError(
              "Only the record owner or users with manage_shares permission can share records.",
            );
          }
        }

        transaction.update(docRef, {
          [`sharedWith.${params.targetUserId}`]: params.permission,
          accessUserIds: FieldValue.arrayUnion(params.targetUserId),
        });
      });

      await deps.auditLogger.log(params.tenantId, {
        action: "share_granted",
        entity: params.entityName,
        recordId: params.recordId,
        actorId: params.callerUserId,
        targetUserId: params.targetUserId,
        permission: params.permission,
        timestamp: new Date().toISOString(),
      });
    },

    async revokeShare(params) {
      const docRef = getDocRef(
        params.tenantId,
        params.collection,
        params.recordId,
      );

      await firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
          throw new ShareAccessError("Record not found.");
        }

        const data = doc.data() as Record<string, unknown>;
        const access = checkRecordAccess(
          data,
          params.callerUserId,
          params.callerPermissions,
          params.entityName,
          params.callerIsSuperAdmin,
        );

        if (!access.isOwner && !params.callerIsSuperAdmin) {
          const hasManageShares = params.callerPermissions.includes(
            `${params.entityName}.manage_shares`,
          );
          if (!hasManageShares) {
            throw new ShareAccessError(
              "Only the record owner or users with manage_shares permission can revoke shares.",
            );
          }
        }

        transaction.update(docRef, {
          [`sharedWith.${params.targetUserId}`]: FieldValue.delete(),
          accessUserIds: FieldValue.arrayRemove(params.targetUserId),
        });
      });

      await deps.auditLogger.log(params.tenantId, {
        action: "share_revoked",
        entity: params.entityName,
        recordId: params.recordId,
        actorId: params.callerUserId,
        targetUserId: params.targetUserId,
        timestamp: new Date().toISOString(),
      });
    },

    async listShares(params) {
      const docRef = getDocRef(
        params.tenantId,
        params.collection,
        params.recordId,
      );
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new ShareAccessError("Record not found.");
      }

      const data = doc.data() as Record<string, unknown>;
      const access = checkRecordAccess(
        data,
        params.callerUserId,
        params.callerPermissions,
        params.entityName,
        params.callerIsSuperAdmin,
      );

      if (!access.isOwner && !params.callerIsSuperAdmin) {
        const hasManageShares = params.callerPermissions.includes(
          `${params.entityName}.manage_shares`,
        );
        if (!hasManageShares) {
          throw new ShareAccessError(
            "Only the record owner or users with manage_shares permission can view shares.",
          );
        }
      }

      const sharedWith = data.sharedWith as Record<string, string> | undefined;
      if (!sharedWith || typeof sharedWith !== "object") {
        return [];
      }

      return Object.entries(sharedWith).map(([userId, permission]) => ({
        userId,
        permission: permission as SharePermission,
      }));
    },
  };
}
