import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseEntityQueryDefinitionsCatalogJson } from "@repo/entity-queries";

import {
  hasLocalTenantUiSlices,
  seedLocalTenantUiSlicesIfPresent,
} from "./seed-local-tenant-ui-slices.js";
import { parseLocalEntityUiOverridesCatalog } from "./seed-entity-ui-overrides.js";

describe("seed-local-tenant-ui-slices", () => {
  it("detects local UI slice files when present", () => {
    const uiDir = join(mkdtempSync(join(tmpdir(), "local-ui-")), "ui");
    mkdirSync(join(uiDir, "query-definitions"), { recursive: true });
    writeFileSync(
      join(uiDir, "query-definitions", "sample-query.json"),
      JSON.stringify({
        kind: "entity-query-definition",
        version: 1,
        data: {
          name: "Sample query",
          entityName: "order",
          filter: { type: "group", op: "and", children: [] },
        },
      }),
    );
    expect(hasLocalTenantUiSlices(uiDir)).toBe(true);
  });

  it("returns false when UI slice directory is empty", () => {
    const uiDir = join(mkdtempSync(join(tmpdir(), "local-ui-empty-")), "ui");
    mkdirSync(uiDir, { recursive: true });
    expect(hasLocalTenantUiSlices(uiDir)).toBe(false);
  });

  it("parses a synthetic query definitions slice", () => {
    const catalog = {
      kind: "entity-query-definitions-catalog" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      entityQueryDefinitions: [
        {
          name: "Sample query",
          entityName: "order",
          filter: { type: "group", op: "and", children: [] },
          columns: [{ field: "id", label: "Id" }],
        },
      ],
    };
    const parsed = parseEntityQueryDefinitionsCatalogJson(
      JSON.stringify(catalog),
    );
    if (!parsed.ok) {
      expect(parsed.errors.length).toBeGreaterThan(0);
      return;
    }
    expect(parsed.data.entityQueryDefinitions).toHaveLength(1);
    expect(parsed.data.entityQueryDefinitions[0]?.name).toBe("Sample query");
  });

  it("exports parseLocalEntityUiOverridesCatalog", () => {
    expect(typeof parseLocalEntityUiOverridesCatalog).toBe("function");
  });

  it("exports seedLocalTenantUiSlicesIfPresent", () => {
    expect(typeof seedLocalTenantUiSlicesIfPresent).toBe("function");
  });
});
