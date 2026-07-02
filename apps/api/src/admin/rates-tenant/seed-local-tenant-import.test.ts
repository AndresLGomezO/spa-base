import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  listPresentLocalImportSpecs,
  resolveLocalTenantImportOwnerEmail,
} from "./seed-local-tenant-import.js";

describe("seed-local-tenant-import", () => {
  it("lists only JSON files that exist in the import directory", () => {
    const importDir = mkdtempSync(join(tmpdir(), "tenant-import-"));
    writeFileSync(join(importDir, "actor.json"), "[]");
    writeFileSync(join(importDir, "category.json"), "[]");

    const specs = listPresentLocalImportSpecs(importDir);
    expect(specs.map((spec) => spec.fileName)).toEqual([
      "category.json",
      "actor.json",
    ]);
  });

  it("returns empty list when import directory has no known JSON files", () => {
    const importDir = mkdtempSync(join(tmpdir(), "tenant-import-empty-"));
    expect(listPresentLocalImportSpecs(importDir)).toEqual([]);
  });

  it("resolves owner email from bootstrap env with fallback", () => {
    expect(typeof resolveLocalTenantImportOwnerEmail()).toBe("string");
    expect(resolveLocalTenantImportOwnerEmail().length).toBeGreaterThan(0);
  });
});
