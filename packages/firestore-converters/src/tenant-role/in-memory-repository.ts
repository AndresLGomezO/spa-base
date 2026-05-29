import {
  createTenantRoleInputSchema,
  patchTenantRoleInputSchema,
  tenantRoleRecordSchema,
  type CreateTenantRoleInput,
  type PatchTenantRoleInput,
  type TenantRoleRecord,
} from "@repo/rbac";
import { nanoid } from "nanoid";

import type { TenantRoleRepository } from "./repository-contract.js";

export function createInMemoryTenantRoleRepository(): TenantRoleRepository & {
  clear(): void;
} {
  const store = new Map<string, Map<string, TenantRoleRecord>>();

  function tenantStore(tenantId: string): Map<string, TenantRoleRecord> {
    let roles = store.get(tenantId);
    if (!roles) {
      roles = new Map();
      store.set(tenantId, roles);
    }
    return roles;
  }

  return {
    clear() {
      store.clear();
    },
    async list(tenantId) {
      return [...tenantStore(tenantId).values()].sort((left, right) =>
        left.name.localeCompare(right.name),
      );
    },
    async getById(tenantId, id) {
      return tenantStore(tenantId).get(id) ?? null;
    },
    async getByName(tenantId, name) {
      const normalized = name.trim();
      for (const role of tenantStore(tenantId).values()) {
        if (role.name === normalized) {
          return role;
        }
      }
      return null;
    },
    async create(tenantId, input: CreateTenantRoleInput) {
      const parsed = createTenantRoleInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `role_${nanoid(12)}`;
      const record = tenantRoleRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        description: parsed.description,
        grants: parsed.grants,
        fieldRules: parsed.fieldRules,
        createdAt: now,
        updatedAt: now,
      });
      tenantStore(tenantId).set(id, record);
      return record;
    },
    async update(tenantId, id, input: PatchTenantRoleInput) {
      const current = await this.getById(tenantId, id);
      if (!current) {
        throw new Error(`Tenant role not found: ${id}`);
      }

      patchTenantRoleInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = tenantRoleRecordSchema.parse({
        ...current,
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.grants ? { grants: input.grants } : {}),
        ...(input.fieldRules !== undefined
          ? { fieldRules: input.fieldRules }
          : {}),
        updatedAt: now,
      });
      tenantStore(tenantId).set(id, next);
      return next;
    },
    async ensureFromTemplate(tenantId, template) {
      const existing = await this.getByName(tenantId, template.name);
      if (existing) {
        return;
      }

      const now = new Date().toISOString();
      const record = tenantRoleRecordSchema.parse({
        id: template.name,
        tenantId,
        name: template.name,
        description: template.description,
        grants: [...template.grants],
        createdAt: now,
        updatedAt: now,
      });
      tenantStore(tenantId).set(record.id, record);
    },
  };
}
