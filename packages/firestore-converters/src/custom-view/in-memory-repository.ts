import {
  createCustomViewInputSchema,
  customViewRecordSchema,
  patchCustomViewInputSchema,
  type CustomViewRecord,
} from "@repo/custom-views";
import { nanoid } from "nanoid";

import type { CustomViewRepository } from "./repository-contract.js";

export function createInMemoryCustomViewRepository(): CustomViewRepository & {
  readonly store: Map<string, CustomViewRecord>;
} {
  const store = new Map<string, CustomViewRecord>();

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
    async listActive(tenantId) {
      return (await this.list(tenantId)).filter(
        (record) => record.status === "ACTIVE",
      );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async getByViewId(tenantId, viewId) {
      return (
        [...store.values()].find(
          (record) =>
            record.tenantId === tenantId &&
            record.viewId === viewId.trim().toLowerCase(),
        ) ?? null
      );
    },
    async create(tenantId, input) {
      const { sourceEntity, ...createInput } = input;
      const parsed = createCustomViewInputSchema.parse(createInput);
      const now = new Date().toISOString();
      const id = `custom_view_${nanoid(12)}`;
      const viewId = parsed.viewId?.trim().toLowerCase() ?? id;
      const record = customViewRecordSchema.parse({
        id,
        tenantId,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        viewId,
        entityQueryDefinitionId: parsed.entityQueryDefinitionId,
        sourceEntity,
        status: parsed.status,
        ...(parsed.hiddenFromNav !== undefined
          ? { hiddenFromNav: parsed.hiddenFromNav }
          : {}),
        ...(parsed.navCategoryId
          ? { navCategoryId: parsed.navCategoryId }
          : {}),
        ...(parsed.navOrder !== undefined ? { navOrder: parsed.navOrder } : {}),
        nav: parsed.nav,
        ui: parsed.ui ?? {
          views: [{ type: "table", name: "default", fields: ["id"] }],
          listViewType: "table",
        },
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Custom view not found: ${id}`);
      }

      const { sourceEntity, ...patchInput } = input;
      patchCustomViewInputSchema.parse(patchInput);
      const now = new Date().toISOString();

      const next = customViewRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.entityQueryDefinitionId
          ? { entityQueryDefinitionId: input.entityQueryDefinitionId }
          : {}),
        ...(sourceEntity ? { sourceEntity } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.hiddenFromNav !== undefined
          ? { hiddenFromNav: input.hiddenFromNav }
          : {}),
        ...(input.navCategoryId !== undefined
          ? input.navCategoryId === null
            ? {}
            : { navCategoryId: input.navCategoryId }
          : {}),
        ...(input.navOrder !== undefined
          ? input.navOrder === null
            ? {}
            : { navOrder: input.navOrder }
          : {}),
        ...(input.nav ? { nav: { ...current.nav, ...input.nav } } : {}),
        ...(input.ui
          ? {
              ui: {
                ...current.ui,
                ...input.ui,
                ...(input.ui.views ? { views: input.ui.views } : {}),
              },
            }
          : {}),
        updatedAt: now,
      });

      if (input.navCategoryId === null) {
        delete (next as { navCategoryId?: string }).navCategoryId;
      }
      if (input.navOrder === null) {
        delete (next as { navOrder?: number }).navOrder;
      }

      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
    async countByQueryDefinitionId(tenantId, entityQueryDefinitionId) {
      return [...store.values()].filter(
        (record) =>
          record.tenantId === tenantId &&
          record.entityQueryDefinitionId === entityQueryDefinitionId,
      ).length;
    },
  };
}
