import { describe, expect, it } from "vitest";

import type { DataHookDefinitionRecord } from "../../lib/api-client";
import {
  buildDataHooksListQueryState,
  filterDataHookDefinitions,
  sortDataHookDefinitions,
} from "./use-data-hooks-list-query";

function hook(
  partial: Partial<DataHookDefinitionRecord> &
    Pick<DataHookDefinitionRecord, "id" | "name" | "entity">,
): DataHookDefinitionRecord {
  return {
    tenantId: "tenant_a",
    phase: "after",
    trigger: { kind: "crud", operation: "create" },
    condition: null,
    actions: [],
    enabled: true,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("use-data-hooks-list-query helpers", () => {
  const definitions = [
    hook({
      id: "h1",
      name: "Alpha",
      entity: "loan",
      order: 1,
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
    hook({
      id: "h2",
      name: "Beta",
      entity: "payment",
      phase: "before",
      enabled: false,
      order: 0,
      trigger: {
        kind: "schedule",
        cron: "0 6 * * *",
        timezone: "UTC",
        scope: "once",
      },
      updatedAt: "2026-01-03T00:00:00.000Z",
    }),
  ];

  it("parses URL search params", () => {
    const params = new URLSearchParams(
      "q=alpha&entity=loan&phase=after&triggerKind=crud&status=enabled&sort=nameDesc",
    );
    expect(buildDataHooksListQueryState(params)).toEqual({
      search: "alpha",
      entities: ["loan"],
      phases: ["after"],
      triggerKinds: ["crud"],
      statuses: ["enabled"],
      sort: "nameDesc",
    });
  });

  it("filters by search, entity, phase, trigger kind, and status", () => {
    const query = buildDataHooksListQueryState(
      new URLSearchParams(
        "entity=loan&phase=after&triggerKind=crud&status=enabled",
      ),
    );
    expect(filterDataHookDefinitions(definitions, query)).toEqual([
      definitions[0],
    ]);
  });

  it("sorts by entity and order by default", () => {
    const query = buildDataHooksListQueryState(new URLSearchParams());
    expect(
      sortDataHookDefinitions(definitions, query.sort).map((entry) => entry.id),
    ).toEqual(["h1", "h2"]);
  });

  it("sorts by updated date descending", () => {
    expect(
      sortDataHookDefinitions(definitions, "updatedDesc").map(
        (entry) => entry.id,
      ),
    ).toEqual(["h2", "h1"]);
  });
});
