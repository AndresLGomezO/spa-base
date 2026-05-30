import { nanoid } from "nanoid";

import {
  tenantUserInviteRecordSchema,
  type TenantUserInviteRecord,
} from "./repository-contract.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createInMemoryTenantUserInviteRepository(): {
  readonly store: Map<string, TenantUserInviteRecord>;
  list(tenantId: string): Promise<readonly TenantUserInviteRecord[]>;
  getByEmail(
    tenantId: string,
    email: string,
  ): Promise<TenantUserInviteRecord | null>;
  create(
    tenantId: string,
    input: { readonly email: string; readonly roles: readonly string[] },
  ): Promise<TenantUserInviteRecord>;
  delete(tenantId: string, id: string): Promise<void>;
  deleteByEmail(tenantId: string, email: string): Promise<void>;
  listPendingForEmail(
    email: string,
  ): Promise<readonly TenantUserInviteRecord[]>;
} {
  const store = new Map<string, TenantUserInviteRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()].filter(
        (record) => record.tenantId === tenantId,
      );
    },
    async getByEmail(tenantId, email) {
      const normalized = normalizeEmail(email);
      return (
        [...store.values()].find(
          (record) =>
            record.tenantId === tenantId &&
            normalizeEmail(record.email) === normalized,
        ) ?? null
      );
    },
    async create(tenantId, input) {
      const normalized = normalizeEmail(input.email);
      const existing = [...store.values()].find(
        (record) =>
          record.tenantId === tenantId &&
          normalizeEmail(record.email) === normalized,
      );
      if (existing) {
        throw new Error(`Invite already exists for ${normalized}.`);
      }

      const now = new Date().toISOString();
      const record = tenantUserInviteRecordSchema.parse({
        id: `invite_${nanoid(12)}`,
        tenantId,
        email: normalized,
        roles: [...input.roles],
        createdAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
    async deleteByEmail(tenantId, email) {
      const normalized = normalizeEmail(email);
      for (const [mapKey, record] of store.entries()) {
        if (
          record.tenantId === tenantId &&
          normalizeEmail(record.email) === normalized
        ) {
          store.delete(mapKey);
        }
      }
    },
    async listPendingForEmail(email) {
      const normalized = normalizeEmail(email);
      return [...store.values()].filter(
        (record) => normalizeEmail(record.email) === normalized,
      );
    },
  };
}
