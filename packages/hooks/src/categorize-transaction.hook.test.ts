import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import type { DataHookDefinition } from "./data-hook-definition.js";
import { parseDataHookDefinitionJson } from "./data-hook-definition-json.js";
import { runDataHook } from "./interpret-data-hook.js";
import { mockHookEntityServices } from "./test/mock-hook-entity-services.js";
import type { HookContext, HookEntityRecord } from "./types.js";

const HOOK_JSON_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.local/tenant-import/catalogs/data-hooks/categorize-transaction.json",
);

function loadCategorizeTransactionHook(): DataHookDefinition {
  const parsed = parseDataHookDefinitionJson(
    readFileSync(HOOK_JSON_PATH, "utf8"),
  );
  if (!parsed.ok) {
    throw new Error(
      `Failed to parse categorize-transaction.json: ${parsed.errors
        .map((error) => error.message)
        .join("; ")}`,
    );
  }
  return {
    ...parsed.data,
    id: "hook_categorize_transaction",
    tenantId: "tenant_a",
    phase: parsed.data.phase ?? "after",
    enabled: parsed.data.enabled ?? true,
    order: parsed.data.order ?? 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("categorize-transaction hook (tenant)", () => {
  it("inherits categoryId from a prior DONE Uber-like txn without calling AI", async () => {
    const definition = loadCategorizeTransactionHook();
    const callAi = vi.fn(async () => {
      throw new Error("callAi must not run for a match-path short-circuit");
    });
    const computeEmbedding = vi.fn(async () => [0.1, 0.2, 0.3] as const);

    const doneUber: HookEntityRecord = {
      id: "txn_uber_done",
      tenantId: "tenant_a",
      description: "UBER *ES-TRIP 12",
      categoryId: "cat_transport",
      categorizationStatus: "DONE",
    };
    const pending: Record<string, unknown> = {
      id: "txn_uber_pending",
      tenantId: "tenant_a",
      description: "UBER *TRIP 987 ES",
      categorizationStatus: "PENDING",
    };

    const updates: Array<{
      entity: string;
      id: string;
      patch: Record<string, unknown>;
    }> = [];

    const list = vi.fn(
      async (entity: string, query: { field: string; value: unknown }) => {
        if (
          entity === "transaction" &&
          query.field === "categorizationStatus" &&
          query.value === "DONE"
        ) {
          return [doneUber];
        }
        if (entity === "categoryExample") {
          return [];
        }
        return [];
      },
    );

    const update = vi.fn(
      async (
        entity: string,
        id: string,
        patch: Record<string, unknown>,
      ): Promise<HookEntityRecord> => {
        updates.push({ entity, id, patch });
        if (entity === "transaction" && id === pending.id) {
          Object.assign(pending, patch);
        }
        return { id, tenantId: "tenant_a", ...patch };
      },
    );

    const create = vi.fn(
      async (entity: string, data: Record<string, unknown>) => {
        return {
          id: `created_${entity}`,
          tenantId: "tenant_a",
          ...data,
        };
      },
    );

    const context: HookContext = {
      tenantId: "tenant_a",
      entityName: "transaction",
      event: "transaction.afterSchedule",
      current: pending,
      user: { uid: "user_1" },
      loaded: {},
      services: {
        callAi,
        computeEmbedding,
        entities: mockHookEntityServices({ list, update, create }),
        logger: { info: vi.fn(), error: vi.fn() },
      },
    };

    await runDataHook(definition, context);

    expect(callAi).not.toHaveBeenCalled();
    expect(pending.categoryId).toBe("cat_transport");
    expect(pending.categorizationStatus).toBe("DONE");
    expect(pending.normalizedDescription).toBe("UBER TRIP ES");

    const categoryPatches = updates.filter(
      (entry) =>
        entry.entity === "transaction" &&
        entry.id === "txn_uber_pending" &&
        "categoryId" in entry.patch,
    );
    expect(categoryPatches).toHaveLength(1);
    expect(categoryPatches[0]?.patch.categoryId).toBe("cat_transport");
  });
});
