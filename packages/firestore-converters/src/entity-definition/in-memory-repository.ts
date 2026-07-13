import {
  applyDisplayFieldToRecord,
  applyDescription,
  applyEmailMatchingEnabled,
  applyHiddenFromNav,
  applyInMemoryListQueries,
  applyNavCategoryId,
  applyNavOrder,
  applyTenantWideRead,
  displayFieldForCreate,
  entityDefinitionRecordSchema,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import { nanoid } from "nanoid";

import type { EntityDefinitionRepository } from "./repository-contract.js";

export function createInMemoryEntityDefinitionRepository(): EntityDefinitionRepository & {
  readonly store: Map<string, EntityDefinitionRecord>;
} {
  const store = new Map<string, EntityDefinitionRecord>();

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
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async getByName(tenantId, name) {
      return (
        [...store.values()].find(
          (record) => record.tenantId === tenantId && record.name === name,
        ) ?? null
      );
    },
    async create(tenantId, input) {
      const existing = [...store.values()].find(
        (record) => record.tenantId === tenantId && record.name === input.name,
      );
      if (existing) {
        throw new Error(`Entity definition "${input.name}" already exists.`);
      }

      const now = new Date().toISOString();
      const record = entityDefinitionRecordSchema.parse({
        id: `def_${nanoid(12)}`,
        tenantId,
        name: input.name,
        label: input.label,
        ...(input.description?.trim()
          ? { description: input.description.trim() }
          : {}),
        fields: input.fields,
        ...(input.ui ? { ui: input.ui } : {}),
        ...(input.tenantWideRead === true ? { tenantWideRead: true } : {}),
        ...(input.inMemoryListQueries === true
          ? { inMemoryListQueries: true }
          : {}),
        ...(input.hiddenFromNav === true ? { hiddenFromNav: true } : {}),
        ...(input.emailMatchingEnabled === true
          ? { emailMatchingEnabled: true }
          : {}),
        ...(input.navCategoryId ? { navCategoryId: input.navCategoryId } : {}),
        ...(input.navOrder !== undefined ? { navOrder: input.navOrder } : {}),
        ...displayFieldForCreate(input),
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Entity definition not found: ${id}`);
      }

      const now = new Date().toISOString();
      const base = applyNavOrder(
        applyNavCategoryId(
          applyEmailMatchingEnabled(
            applyHiddenFromNav(
              applyInMemoryListQueries(
                applyTenantWideRead(
                  applyDescription(
                    applyDisplayFieldToRecord(
                      {
                        ...current,
                        ...(input.label ? { label: input.label } : {}),
                        ...(input.fields ? { fields: input.fields } : {}),
                        version: current.version + 1,
                        updatedAt: now,
                      },
                      input,
                    ),
                    input.description,
                  ),
                  input.tenantWideRead,
                ),
                input.inMemoryListQueries,
              ),
              input.hiddenFromNav,
            ),
            input.emailMatchingEnabled,
          ),
          input.navCategoryId,
        ),
        input.navOrder,
      );
      const { ui: _droppedUi, ...withoutUi } = base;
      void _droppedUi;
      const next = entityDefinitionRecordSchema.parse({
        ...(input.fields && !input.ui ? withoutUi : base),
        ...(input.ui ? { ui: input.ui } : {}),
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Entity definition not found: ${id}`);
      }
      store.delete(key(tenantId, id));
    },
  };
}
