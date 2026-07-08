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
    });
  });

  it("parses --gcp with --project", () => {
    expect(
      parseSeedDatabaseArgs(["--gcp", "--project", "entitysystem-development"]),
    ).toEqual({
      gcp: true,
      projectId: "entitysystem-development",
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
    });
  });

  it("accepts --project=value form", () => {
    expect(
      parseSeedDatabaseArgs(["--gcp", "--project=entitysystem-development"]),
    ).toEqual({
      gcp: true,
      projectId: "entitysystem-development",
    });
  });

  it("requires --project when --gcp is set", () => {
    expect(() => parseSeedDatabaseArgs(["--gcp"])).toThrow(
      "--project is required when using --gcp.",
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
