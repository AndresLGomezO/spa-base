import type { Tenant, TenantStatus } from "@repo/shared-types";
import type {
  CreateTenantInput,
  TenantRepository,
  UpdateTenantInput,
} from "@repo/firestore-converters";

const nowIso = () => new Date().toISOString();

function makeTenant(
  id: string,
  name: string,
  status: TenantStatus = "active",
): Tenant {
  const timestamp = nowIso();
  return {
    id,
    name,
    status,
    createdBy: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    defaultLocale: "en",
  };
}

const defaultMockTenants: readonly Tenant[] = [
  makeTenant("tenant_a", "Tenant A"),
  makeTenant("tenant_b", "Tenant B"),
];

export function createInMemoryTenantRepository(
  initialTenants: readonly Tenant[] = defaultMockTenants,
): TenantRepository {
  const tenants = new Map(initialTenants.map((tenant) => [tenant.id, tenant]));

  return {
    async list(params) {
      const all = [...tenants.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
      );
      if (!params?.status) {
        return all;
      }
      return all.filter((tenant) => tenant.status === params.status);
    },

    async getById(id) {
      return tenants.get(id) ?? null;
    },

    async create(input: CreateTenantInput) {
      const id = input.id?.trim() || `tenant_${tenants.size + 1}`;
      if (tenants.has(id)) {
        throw new Error(`Tenant already exists: ${id}`);
      }

      const tenant = makeTenant(id, input.name.trim());
      tenants.set(id, {
        ...tenant,
        createdBy: input.createdBy,
      });
      return tenants.get(id)!;
    },

    async update(id, input: UpdateTenantInput) {
      const existing = tenants.get(id);
      if (!existing) {
        return null;
      }

      const updated: Tenant = {
        ...existing,
        name: input.name?.trim() ?? existing.name,
        status: input.status ?? existing.status,
        appearance:
          input.appearance === null
            ? undefined
            : input.appearance !== undefined
              ? { ...existing.appearance, ...input.appearance }
              : existing.appearance,
        aiLimits:
          input.aiLimits === null
            ? undefined
            : input.aiLimits !== undefined
              ? { ...existing.aiLimits, ...input.aiLimits }
              : existing.aiLimits,
        defaultLocale:
          input.defaultLocale !== undefined
            ? input.defaultLocale.trim()
            : existing.defaultLocale,
        updatedAt: nowIso(),
      };
      if (input.aiLimits === null) {
        Reflect.deleteProperty(updated, "aiLimits");
      }
      tenants.set(id, updated);
      return updated;
    },

    async ensureTenant(id, name, createdBy) {
      if (tenants.has(id)) {
        return;
      }

      tenants.set(id, {
        ...makeTenant(id, name),
        createdBy,
      });
    },
  };
}
