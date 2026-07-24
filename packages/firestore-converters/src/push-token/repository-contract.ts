import type {
  PushTokenRecord,
  UpsertPushTokenInput,
} from "@repo/user-notifications";

export type { PushTokenRecord, UpsertPushTokenInput };

export interface PushTokenRepository {
  upsert(
    tenantId: string,
    input: UpsertPushTokenInput,
  ): Promise<PushTokenRecord>;
  deleteByToken(
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<boolean>;
  listForUser(tenantId: string, userId: string): Promise<PushTokenRecord[]>;
}
