import {
  ORGANIZATION_SCHEMA_VERSION,
  persistedOrganizationSchemaV1,
  type OrganizationRecord,
} from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { organizationConverter } from "./schema.latest.js";

describe("organizationConverter", () => {
  it("round-trips domain records", () => {
    const record: OrganizationRecord = {
      id: "org_1",
      tenantId: "tenant_a",
      name: "Acme",
      email: "acme@example.com",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const persisted = organizationConverter.write(record);
    expect(persisted._schemaVersion).toBe(ORGANIZATION_SCHEMA_VERSION);
    expect(organizationConverter.read(persisted)).toEqual(record);
  });

  it("validates persisted shape", () => {
    const parsed = persistedOrganizationSchemaV1.safeParse({
      id: "org_1",
      tenantId: "tenant_a",
      name: "Acme",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      _schemaVersion: ORGANIZATION_SCHEMA_VERSION,
    });
    expect(parsed.success).toBe(true);
  });
});
