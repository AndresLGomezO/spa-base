import {
  assertWritableFields,
  filterFields,
  hasPermission,
  resolveFieldAccessMap,
} from "@repo/rbac";
import { nanoid } from "nanoid";
import type { HookEntityServices } from "@repo/hooks";
import type { RoleCatalog } from "@repo/rbac";

import type { EntityRuntimeForCrudHooks } from "./crud-hook-deps.types.js";

export function createHookEntityServices(options: {
  readonly entityRuntime: EntityRuntimeForCrudHooks;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantId: string;
  readonly roleCatalog?: RoleCatalog;
  readonly platformRole?: string | null;
  readonly tenantRoleNames?: readonly string[];
}): HookEntityServices {
  function resolveFieldAccess(
    entityName: string,
    entityFieldNames: readonly string[],
    action: "read" | "create" | "update",
  ) {
    if (options.isSuperAdmin) {
      return {};
    }

    if (!options.roleCatalog) {
      return {};
    }

    return resolveFieldAccessMap(
      {
        platformRole: options.platformRole ?? null,
        tenants:
          options.tenantRoleNames && options.tenantRoleNames.length > 0
            ? { [options.tenantId]: options.tenantRoleNames }
            : {},
        tenantId: options.tenantId,
      },
      entityName,
      entityFieldNames,
      {
        roleCatalog: options.roleCatalog,
        action,
      },
    );
  }

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

      const businessFieldNames = Object.keys(entity.metadata.fields);
      assertWritableFields(
        data,
        resolveFieldAccess(entityName, businessFieldNames, "create"),
        businessFieldNames,
      );

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
      return filterFields(
        created as Record<string, unknown>,
        resolveFieldAccess(entityName, businessFieldNames, "read"),
        businessFieldNames,
      );
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

      const businessFieldNames = Object.keys(entity.metadata.fields);
      assertWritableFields(
        data,
        resolveFieldAccess(entityName, businessFieldNames, "update"),
        businessFieldNames,
      );

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

      const validated = entity.schema.parse(updated) as Record<string, unknown>;
      return filterFields(
        validated,
        resolveFieldAccess(entityName, businessFieldNames, "read"),
        businessFieldNames,
      );
    },
  };
}
