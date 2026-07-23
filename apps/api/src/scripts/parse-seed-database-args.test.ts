import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseSeedDatabaseArgs } from "./parse-seed-database-args.js";
import {
  resolveRepoRoot,
  resolveTenantImportDir,
} from "./resolve-tenant-import-dir.js";

describe("parseSeedDatabaseArgs", () => {
  it("defaults to emulator mode with no flags", () => {
    expect(parseSeedDatabaseArgs([])).toEqual({
      gcp: false,
      projectId: undefined,
      components: null,
      ids: null,
      drop: false,
    });
  });

  it("parses --gcp with --project", () => {
    expect(
      parseSeedDatabaseArgs(["--gcp", "--project", "entitysystem-development"]),
    ).toEqual({
      gcp: true,
      projectId: "entitysystem-development",
      components: null,
      ids: null,
      drop: false,
    });
  });

  it("ignores pnpm/npm argument separator --", () => {
    expect(
      parseSeedDatabaseArgs([
        "--",
        "--gcp",
        "--project",
        "entitysystem-development",
      ]),
    ).toEqual({
      gcp: true,
      projectId: "entitysystem-development",
      components: null,
      ids: null,
      drop: false,
    });
  });

  it("accepts --project=value form", () => {
    expect(
      parseSeedDatabaseArgs(["--gcp", "--project=entitysystem-development"]),
    ).toEqual({
      gcp: true,
      projectId: "entitysystem-development",
      components: null,
      ids: null,
      drop: false,
    });
  });

  it("requires --project when --gcp is set", () => {
    expect(() => parseSeedDatabaseArgs(["--gcp"])).toThrow(
      "--project is required when using --gcp.",
    );
  });

  it("parses --only components", () => {
    const result = parseSeedDatabaseArgs([
      "--only",
      "financialItem,emailMatchBindings",
    ]);
    expect(result.components).toEqual(
      new Set(["financialItem", "emailMatchBindings"]),
    );
    expect(result.ids).toBeNull();
    expect(result.drop).toBe(false);
  });

  it("parses --only= and --ids=", () => {
    const result = parseSeedDatabaseArgs([
      "--only=hooks,financialItem",
      "--ids=7c2e9f11-2518-4b3a-9d4e-030cd8568c15",
    ]);
    expect(result.components).toEqual(new Set(["hooks", "financialItem"]));
    expect(result.ids).toEqual(
      new Set(["7c2e9f11-2518-4b3a-9d4e-030cd8568c15"]),
    );
    expect(result.drop).toBe(false);
  });

  it("parses --drop with record-level --only", () => {
    const result = parseSeedDatabaseArgs([
      "--only",
      "emailMatchBindings",
      "--drop",
    ]);
    expect(result.components).toEqual(new Set(["emailMatchBindings"]));
    expect(result.drop).toBe(true);
  });

  it("requires --only when --ids is set", () => {
    expect(() => parseSeedDatabaseArgs(["--ids", "abc"])).toThrow(
      "--ids requires --only.",
    );
  });

  it("requires --only when --drop is set", () => {
    expect(() => parseSeedDatabaseArgs(["--drop"])).toThrow(
      "--drop requires --only",
    );
  });

  it("rejects --drop with only catalog components", () => {
    expect(() =>
      parseSeedDatabaseArgs(["--only", "hooks", "--drop"]),
    ).toThrow(/--drop only supports record-level/);
  });

  it("rejects unknown --only components", () => {
    expect(() => parseSeedDatabaseArgs(["--only", "nope"])).toThrow(
      /Unknown --only component/,
    );
  });

  it("rejects --ids with only non-record components", () => {
    expect(() =>
      parseSeedDatabaseArgs(["--only", "hooks", "--ids", "abc"]),
    ).toThrow(/--ids requires at least one record-level/);
  });

  it("rejects empty --only", () => {
    expect(() => parseSeedDatabaseArgs(["--only", ","])).toThrow(
      /Missing value for --only/,
    );
  });
});

describe("resolveTenantImportDir", () => {
  it("prefers TENANT_IMPORT_DIR when set", () => {
    const customDir = mkdtempSync(join(tmpdir(), "tenant-import-custom-"));
    const previous = process.env.TENANT_IMPORT_DIR;
    process.env.TENANT_IMPORT_DIR = customDir;

    try {
      expect(resolveTenantImportDir()).toBe(customDir);
    } finally {
      if (previous === undefined) {
        delete process.env.TENANT_IMPORT_DIR;
      } else {
        process.env.TENANT_IMPORT_DIR = previous;
      }
    }
  });

  it("resolves repo root from nested package cwd", () => {
    const repoRoot = resolveRepoRoot(process.cwd());
    expect(resolveTenantImportDir(repoRoot)).toBe(
      join(repoRoot, ".local/tenant-import"),
    );
  });
});
