import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parseDataHooksCatalogJson } from "@repo/hooks";

import {
  deserializeDataHookFromFirestore,
  serializeDataHookForFirestore,
} from "./data-hook-firestore-serialization.js";

function mergeCatalog(dir: string, kind: string, itemsKey: string): string {
  if (!existsSync(dir)) {
    throw new Error(`Catalog directory not found: ${dir}`);
  }
  const items = readdirSync(dir)
    .filter((n) => n.endsWith(".json") && !n.startsWith("_"))
    .sort()
    .map(
      (n) =>
        (JSON.parse(readFileSync(join(dir, n), "utf8")) as { data: unknown })
          .data,
    );
  return JSON.stringify({
    kind,
    version: 1,
    exportedAt: new Date().toISOString(),
    [itemsKey]: items,
  });
}

function maxFirestoreDepth(value: unknown, depth = 0): number {
  if (value === null || typeof value !== "object") {
    return depth;
  }
  if (Array.isArray(value)) {
    return Math.max(
      depth,
      ...value.map((entry) => maxFirestoreDepth(entry, depth + 1)),
    );
  }
  return Math.max(
    depth,
    ...Object.values(value).map((entry) => maxFirestoreDepth(entry, depth + 1)),
  );
}

describe("data hook firestore serialization", () => {
  it("round-trips legacy nested hook documents without a serialization marker", () => {
    const legacy = {
      id: "hook_legacy",
      tenantId: "tenant_test",
      name: "Legacy hook",
      entity: "loan",
      phase: "after",
      trigger: { operation: "create" },
      condition: null,
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "OK" },
        },
      ],
      enabled: true,
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(deserializeDataHookFromFirestore(legacy).actions).toEqual(
      legacy.actions,
    );
  });

  it("keeps serialized loan hooks within Firestore nesting limits", () => {
    const catalogDir = resolve(
      import.meta.dirname,
      "../../../apps/api/src/admin/rates-tenant/catalogs/data-hooks",
    );
    const parsed = parseDataHooksCatalogJson(
      mergeCatalog(catalogDir, "data-hooks-catalog", "dataHooks"),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const loanHook = parsed.data.dataHooks.find(
      (hook) => hook.name === "Generate loan payment plan",
    );
    expect(loanHook).toBeDefined();
    if (!loanHook) {
      return;
    }

    const record = {
      id: "hook_test",
      tenantId: "tenant_test",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      phase: loanHook.phase ?? "after",
      trigger: loanHook.trigger,
      condition: loanHook.condition ?? null,
      actions: loanHook.actions,
      enabled: loanHook.enabled ?? true,
      order: loanHook.order ?? 0,
      name: loanHook.name,
      entity: loanHook.entity,
    };

    const serialized = serializeDataHookForFirestore(record);
    expect(maxFirestoreDepth(serialized)).toBeLessThanOrEqual(20);
    expect(typeof serialized.actions).toBe("string");
    expect(typeof serialized.trigger).toBe("string");

    const roundTrip = deserializeDataHookFromFirestore(serialized);
    expect(roundTrip.actions).toEqual(record.actions);
    expect(roundTrip.trigger).toEqual(record.trigger);
    expect(roundTrip.condition).toEqual(record.condition);
  });
});
