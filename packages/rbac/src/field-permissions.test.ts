import { describe, expect, it } from "vitest";

import { buildTenantRoleCatalog } from "./build-role-catalog.js";
import {
  assertWritableFields,
  FieldAccessError,
  filterFields,
  mergeFieldAccessMaps,
  resolveFieldAccessMap,
} from "./field-permissions.js";
import { resolvePermissions } from "./resolve-permissions.js";

const entityFields = ["name", "amount", "internalNotes"] as const;

describe("resolveFieldAccessMap", () => {
  const tenantId = "tenant_a";

  it("grants write to all fields for superadmin", () => {
    const map = resolveFieldAccessMap(
      { tenantId, platformRole: "superadmin" },
      "loan",
      entityFields,
    );

    expect(map).toEqual({
      name: "write",
      amount: "write",
      internalNotes: "write",
    });
  });

  it("denies all fields when entity read is missing", () => {
    const map = resolveFieldAccessMap(
      { tenantId, tenants: { [tenantId]: ["viewer"] } },
      "loan",
      entityFields,
      {
        roleCatalog: buildTenantRoleCatalog([
          {
            id: "role_viewer",
            tenantId,
            name: "viewer",
            grants: ["organization.read"],
            createdAt: "2020-01-01T00:00:00.000Z",
            updatedAt: "2020-01-01T00:00:00.000Z",
          },
        ]),
      },
    );

    expect(map).toEqual({
      name: "none",
      amount: "none",
      internalNotes: "none",
    });
  });

  it("inherits entity read as write on GET when no field rules exist", () => {
    const roleCatalog = buildTenantRoleCatalog([
      {
        id: "role_viewer",
        tenantId,
        name: "viewer",
        grants: ["loan.read"],
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    const map = resolveFieldAccessMap(
      { tenantId, tenants: { [tenantId]: ["viewer"] } },
      "loan",
      entityFields,
      { roleCatalog, action: "read" },
    );

    expect(map).toEqual({
      name: "write",
      amount: "write",
      internalNotes: "write",
    });
  });

  it("applies explicit field rules with default for unlisted fields", () => {
    const roleCatalog = buildTenantRoleCatalog([
      {
        id: "role_viewer",
        tenantId,
        name: "viewer",
        grants: ["loan.read"],
        fieldRules: [
          {
            resource: "loan",
            fields: [
              { field: "internalNotes", access: "none" },
              { field: "amount", access: "read" },
            ],
          },
        ],
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    const map = resolveFieldAccessMap(
      { tenantId, tenants: { [tenantId]: ["viewer"] } },
      "loan",
      entityFields,
      { roleCatalog, action: "read" },
    );

    expect(map).toEqual({
      name: "write",
      amount: "read",
      internalNotes: "none",
    });
  });

  it("uses most permissive union across multiple roles", () => {
    const roleCatalog = buildTenantRoleCatalog([
      {
        id: "role_a",
        tenantId,
        name: "restricted",
        grants: ["loan.read"],
        fieldRules: [
          {
            resource: "loan",
            fields: [{ field: "amount", access: "none" }],
          },
        ],
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
      {
        id: "role_b",
        tenantId,
        name: "finance",
        grants: ["loan.read"],
        fieldRules: [
          {
            resource: "loan",
            fields: [{ field: "amount", access: "write" }],
          },
        ],
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    const map = resolveFieldAccessMap(
      {
        tenantId,
        tenants: { [tenantId]: ["restricted", "finance"] },
      },
      "loan",
      entityFields,
      { roleCatalog, action: "update" },
    );

    expect(map.amount).toBe("write");
  });

  it("uses read-only default for update action when only read grant exists", () => {
    const roleCatalog = buildTenantRoleCatalog([
      {
        id: "role_viewer",
        tenantId,
        name: "viewer",
        grants: ["loan.read"],
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    const map = resolveFieldAccessMap(
      { tenantId, tenants: { [tenantId]: ["viewer"] } },
      "loan",
      entityFields,
      { roleCatalog, action: "update" },
    );

    expect(map).toEqual({
      name: "read",
      amount: "read",
      internalNotes: "read",
    });
  });
});

describe("filterFields", () => {
  it("removes fields with none access", () => {
    const record = {
      id: "1",
      tenantId: "tenant_a",
      name: "Loan A",
      amount: 100,
      internalNotes: "secret",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    };

    const filtered = filterFields(
      record,
      {
        name: "write",
        amount: "read",
        internalNotes: "none",
      },
      entityFields,
    );

    expect(filtered).toEqual({
      id: "1",
      tenantId: "tenant_a",
      name: "Loan A",
      amount: 100,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
  });
});

describe("assertWritableFields", () => {
  it("allows write fields", () => {
    expect(() =>
      assertWritableFields(
        { name: "Loan A", amount: 100 },
        { name: "write", amount: "write", internalNotes: "none" },
        entityFields,
      ),
    ).not.toThrow();
  });

  it("rejects read-only and none fields", () => {
    expect(() =>
      assertWritableFields(
        { amount: 100, internalNotes: "secret" },
        { name: "write", amount: "read", internalNotes: "none" },
        entityFields,
      ),
    ).toThrow(FieldAccessError);

    try {
      assertWritableFields(
        { amount: 100, internalNotes: "secret" },
        { name: "write", amount: "read", internalNotes: "none" },
        entityFields,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(FieldAccessError);
      expect((error as FieldAccessError).fieldErrors).toEqual({
        amount: "Field is read-only.",
        internalNotes: "Field is not accessible.",
      });
    }
  });
});

describe("mergeFieldAccessMaps", () => {
  it("picks most permissive access per field", () => {
    expect(
      mergeFieldAccessMaps([
        { amount: "none", name: "read" },
        { amount: "write", name: "read" },
      ]),
    ).toEqual({
      amount: "write",
      name: "read",
    });
  });
});

describe("resolvePermissions with role permissions", () => {
  it("includes role permissions for admin wildcard", () => {
    const permissions = resolvePermissions({
      tenantId: "tenant_a",
      tenants: { tenant_a: ["admin"] },
    });

    expect(permissions).toEqual(
      expect.arrayContaining(["role.read", "role.create", "role.update"]),
    );
  });
});
