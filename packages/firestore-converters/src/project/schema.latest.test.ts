import {
  persistedProjectSchemaV1,
  PROJECT_SCHEMA_VERSION,
  type ProjectRecord,
} from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { projectConverter } from "./schema.latest.js";

describe("projectConverter", () => {
  it("round-trips domain records", () => {
    const record: ProjectRecord = {
      id: "proj_1",
      tenantId: "tenant_a",
      name: "Website Redesign",
      budget: 1000,
      organizationId: "org_1",
      isCompleted: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const persisted = projectConverter.write(record);
    expect(persisted._schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(projectConverter.read(persisted)).toEqual(record);
  });

  it("validates persisted shape", () => {
    const parsed = persistedProjectSchemaV1.safeParse({
      id: "proj_1",
      tenantId: "tenant_a",
      name: "Website Redesign",
      budget: 1000,
      organizationId: "org_1",
      isCompleted: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      _schemaVersion: PROJECT_SCHEMA_VERSION,
    });
    expect(parsed.success).toBe(true);
  });
});
