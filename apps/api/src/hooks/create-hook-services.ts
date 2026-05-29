import { hasPermission } from "@repo/rbac";
import { nanoid } from "nanoid";
import type { HookEntityServices } from "@repo/hooks";

import type { EntityRuntimeForCrudHooks } from "./crud-hook-deps.types.js";

export function createHookEntityServices(options: {
  readonly entityRuntime: EntityRuntimeForCrudHooks;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantId: string;
}): HookEntityServices {
  return {
    async create(entityName, data) {
      if (
        !hasPermission(`${entityName}.create`, options.permissions, {
          isSuperAdmin: options.isSuperAdmin,
        })
      ) {
        throw new Error(
          `Hook runner lacks permission to create ${entityName} records.`,
        );
      }

      const entity = options.entityRuntime.resolveEntity(
        entityName,
        options.tenantId,
      );
      if (!entity) {
        throw new Error(`Entity "${entityName}" is not registered.`);
      }

      const repository = options.entityRuntime.getRepository(
        options.tenantId,
        entityName,
      );
      if (!repository) {
        throw new Error(`Repository for "${entityName}" is not available.`);
      }

      const now = new Date().toISOString();
      const parsed = entity.createSchema.parse(data);
      const record = entity.schema.parse({
        ...parsed,
        id: nanoid(),
        tenantId: options.tenantId,
        createdAt: now,
        updatedAt: now,
      });

      const created = await repository.create(
        options.tenantId,
        record as { readonly id: string; readonly tenantId: string },
      );
      return created as Record<string, unknown>;
    },

    async update(entityName, id, data) {
      if (
        !hasPermission(`${entityName}.update`, options.permissions, {
          isSuperAdmin: options.isSuperAdmin,
        })
      ) {
        throw new Error(
          `Hook runner lacks permission to update ${entityName} records.`,
        );
      }

      const entity = options.entityRuntime.resolveEntity(
        entityName,
        options.tenantId,
      );
      if (!entity) {
        throw new Error(`Entity "${entityName}" is not registered.`);
      }

      const repository = options.entityRuntime.getRepository(
        options.tenantId,
        entityName,
      );
      if (!repository) {
        throw new Error(`Repository for "${entityName}" is not available.`);
      }

      const existing = await repository.findById(id, options.tenantId);
      if (!existing) {
        throw new Error(`Record "${id}" was not found for ${entityName}.`);
      }

      const now = new Date().toISOString();
      const parsedUpdate = entity.updateSchema.parse(data);
      const updated = await repository.update(id, options.tenantId, {
        ...parsedUpdate,
        updatedAt: now,
      });

      if (!updated) {
        throw new Error(`Failed to update ${entityName} record "${id}".`);
      }

      return entity.schema.parse(updated) as Record<string, unknown>;
    },
  };
}
