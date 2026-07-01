import { prepareRecordSearchFields } from "@repo/entities";
import { nanoid } from "nanoid";
import type {
  HookEntityRuntime,
  HookEntityServices,
  HookEntityWriteOptions,
  HookOperation,
  HookPhase,
} from "./types.js";

export type HookFieldAccessLevel = "read" | "write" | "none";

export interface HookEntityAccessControl {
  hasPermission(permission: string): boolean;
  resolveFieldAccess(
    entityName: string,
    entityFieldNames: readonly string[],
    action: "read" | "create" | "update",
  ): Record<string, HookFieldAccessLevel>;
  assertWritableFields(
    data: Record<string, unknown>,
    fieldAccess: Record<string, HookFieldAccessLevel>,
    businessFieldNames: readonly string[],
  ): void;
  filterFields(
    record: Record<string, unknown>,
    fieldAccess: Record<string, HookFieldAccessLevel>,
    businessFieldNames: readonly string[],
  ): Record<string, unknown>;
}

export interface DispatchChainedHooksParams {
  readonly entityName: string;
  readonly phase: HookPhase;
  readonly operation: HookOperation;
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly depth: number;
  readonly visitedHookIds: ReadonlySet<string>;
}

export function createHookEntityServices(options: {
  readonly entityRuntime: HookEntityRuntime;
  readonly accessControl: HookEntityAccessControl;
  readonly tenantId: string;
  readonly ownerUserId?: string;
  readonly dispatchChainedHooks?: (
    params: DispatchChainedHooksParams,
  ) => Promise<Record<string, unknown>>;
}): HookEntityServices {
  const { accessControl } = options;

  function withOwnershipDefaults(
    record: Record<string, unknown>,
  ): Record<string, unknown> {
    const ownerId = options.ownerUserId?.trim();
    if (!ownerId) {
      return record;
    }

    return {
      ...record,
      ownerId,
      accessUserIds: [ownerId],
      sharedWith: record.sharedWith ?? {},
    };
  }

  function chainedDispatchParams(
    entityName: string,
    phase: HookPhase,
    operation: HookOperation,
    current: Record<string, unknown>,
    writeOptions: HookEntityWriteOptions | undefined,
    previous?: Record<string, unknown>,
  ): DispatchChainedHooksParams {
    return {
      entityName,
      phase,
      operation,
      current,
      ...(previous ? { previous } : {}),
      depth: (writeOptions?.depth ?? 0) + 1,
      visitedHookIds: writeOptions?.visitedHookIds ?? new Set<string>(),
    };
  }

  return {
    async create(entityName, data, writeOptions) {
      if (!accessControl.hasPermission(`${entityName}.create`)) {
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
      accessControl.assertWritableFields(
        data,
        accessControl.resolveFieldAccess(
          entityName,
          businessFieldNames,
          "create",
        ),
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
      let record = entity.schema.parse(
        prepareRecordSearchFields(
          entity,
          withOwnershipDefaults({
            ...parsed,
            id: nanoid(),
            tenantId: options.tenantId,
            createdAt: now,
            updatedAt: now,
          }),
        ),
      ) as Record<string, unknown>;

      if (writeOptions?.chainHooks && options.dispatchChainedHooks) {
        record = await options.dispatchChainedHooks(
          chainedDispatchParams(
            entityName,
            "before",
            "create",
            record,
            writeOptions,
          ),
        );
        record = entity.schema.parse(
          prepareRecordSearchFields(entity, record),
        ) as Record<string, unknown>;

        const created = await repository.create(
          options.tenantId,
          record as { readonly id: string; readonly tenantId: string },
        );

        await options.dispatchChainedHooks(
          chainedDispatchParams(
            entityName,
            "after",
            "create",
            created as Record<string, unknown>,
            writeOptions,
          ),
        );

        return filterReadResult(
          accessControl,
          entityName,
          businessFieldNames,
          created,
        );
      }

      const created = await repository.create(
        options.tenantId,
        record as { readonly id: string; readonly tenantId: string },
      );
      return filterReadResult(
        accessControl,
        entityName,
        businessFieldNames,
        created,
      );
    },

    async update(entityName, id, data, writeOptions) {
      if (!accessControl.hasPermission(`${entityName}.update`)) {
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
      accessControl.assertWritableFields(
        data,
        accessControl.resolveFieldAccess(
          entityName,
          businessFieldNames,
          "update",
        ),
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
      const previous = existing as Record<string, unknown>;
      let merged: Record<string, unknown> = {
        ...previous,
        ...parsedUpdate,
        updatedAt: now,
      };

      if (writeOptions?.chainHooks && options.dispatchChainedHooks) {
        merged = await options.dispatchChainedHooks(
          chainedDispatchParams(
            entityName,
            "before",
            "update",
            merged,
            writeOptions,
            previous,
          ),
        );

        const validated = entity.schema.parse(merged) as Record<
          string,
          unknown
        >;
        const updatePayload: Record<string, unknown> = { ...validated };
        delete updatePayload.id;
        delete updatePayload.tenantId;
        delete updatePayload.createdAt;

        const updated = await repository.update(id, options.tenantId, {
          ...updatePayload,
          updatedAt: now,
        });

        if (!updated) {
          throw new Error(`Failed to update ${entityName} record "${id}".`);
        }

        const validatedUpdated = entity.schema.parse(updated) as Record<
          string,
          unknown
        >;

        await options.dispatchChainedHooks(
          chainedDispatchParams(
            entityName,
            "after",
            "update",
            validatedUpdated,
            writeOptions,
            previous,
          ),
        );

        return filterReadResult(
          accessControl,
          entityName,
          businessFieldNames,
          validatedUpdated,
        );
      }

      const updated = await repository.update(id, options.tenantId, {
        ...parsedUpdate,
        updatedAt: now,
      });

      if (!updated) {
        throw new Error(`Failed to update ${entityName} record "${id}".`);
      }

      const validated = entity.schema.parse(updated) as Record<string, unknown>;
      return filterReadResult(
        accessControl,
        entityName,
        businessFieldNames,
        validated,
      );
    },

    async list(entityName, query) {
      if (!accessControl.hasPermission(`${entityName}.read`)) {
        throw new Error(
          `Hook runner lacks permission to read ${entityName} records.`,
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

      const businessFieldNames = Object.keys(entity.metadata.fields);
      const readAccess = accessControl.resolveFieldAccess(
        entityName,
        businessFieldNames,
        "read",
      );

      const result = await repository.findByField({
        tenantId: options.tenantId,
        field: query.field,
        value: query.value,
        ...(query.limit !== undefined ? { limit: query.limit } : {}),
      });

      return result.items.map((item) => {
        const record = item as Record<string, unknown>;
        const filtered = accessControl.filterFields(
          record,
          readAccess,
          businessFieldNames,
        );
        return {
          ...filtered,
          id: record.id as string,
          tenantId: record.tenantId as string,
        };
      });
    },

    async get(entityName, id) {
      if (!accessControl.hasPermission(`${entityName}.read`)) {
        throw new Error(
          `Hook runner lacks permission to read ${entityName} records.`,
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

      const record = existing as Record<string, unknown>;
      const businessFieldNames = Object.keys(entity.metadata.fields);
      const readAccess = accessControl.resolveFieldAccess(
        entityName,
        businessFieldNames,
        "read",
      );
      const filtered = accessControl.filterFields(
        record,
        readAccess,
        businessFieldNames,
      );
      return {
        ...filtered,
        id: record.id as string,
        tenantId: record.tenantId as string,
      };
    },

    async delete(entityName, id, writeOptions) {
      if (!accessControl.hasPermission(`${entityName}.delete`)) {
        throw new Error(
          `Hook runner lacks permission to delete ${entityName} records.`,
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

      const record = existing as Record<string, unknown>;

      if (writeOptions?.chainHooks && options.dispatchChainedHooks) {
        await options.dispatchChainedHooks(
          chainedDispatchParams(
            entityName,
            "before",
            "delete",
            record,
            writeOptions,
          ),
        );

        const deleted = await repository.delete(id, options.tenantId);
        if (!deleted) {
          throw new Error(`Failed to delete ${entityName} record "${id}".`);
        }

        await options.dispatchChainedHooks(
          chainedDispatchParams(
            entityName,
            "after",
            "delete",
            { id, tenantId: options.tenantId },
            writeOptions,
            record,
          ),
        );

        return true;
      }

      return repository.delete(id, options.tenantId);
    },
  };
}

function filterReadResult(
  accessControl: HookEntityAccessControl,
  entityName: string,
  businessFieldNames: readonly string[],
  record: { readonly [key: string]: unknown },
): Record<string, unknown> {
  return accessControl.filterFields(
    record as Record<string, unknown>,
    accessControl.resolveFieldAccess(entityName, businessFieldNames, "read"),
    businessFieldNames,
  );
}
