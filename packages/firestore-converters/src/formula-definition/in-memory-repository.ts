import {
  createFormulaDefinitionInputSchema,
  formulaDefinitionSchema,
  patchFormulaDefinitionInputSchema,
  type FormulaDefinition,
} from "@repo/formula-definitions/types";
import { nanoid } from "nanoid";

import type { FormulaDefinitionRepository } from "./repository-contract.js";

export function createInMemoryFormulaDefinitionRepository(): FormulaDefinitionRepository & {
  readonly store: Map<string, FormulaDefinition>;
} {
  const store = new Map<string, FormulaDefinition>();

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
    async listEnabled(tenantId) {
      return (await this.list(tenantId)).filter((record) => record.enabled);
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input) {
      const parsed = createFormulaDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `formula_${nanoid(12)}`;
      const record = formulaDefinitionSchema.parse({
        id,
        tenantId,
        source: "tenant",
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        inputs: parsed.inputs,
        body: parsed.body,
        enabled: parsed.enabled,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Formula definition not found: ${id}`);
      }
      if (current.source === "platform") {
        throw new Error(`Platform formula "${current.name}" is read-only.`);
      }

      patchFormulaDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = formulaDefinitionSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.inputs ? { inputs: input.inputs } : {}),
        ...(input.body ? { body: input.body } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        updatedAt: now,
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      const current = store.get(key(tenantId, id));
      if (current?.source === "platform") {
        throw new Error(
          `Platform formula "${current.name}" cannot be deleted.`,
        );
      }
      store.delete(key(tenantId, id));
    },
  };
}
