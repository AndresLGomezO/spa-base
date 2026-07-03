import { describe, expect, it } from "vitest";

import {
  assertTenantBundleCollectionImportOrder,
  rewriteTenantBundleTenantId,
  serializeTenantBundle,
  TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
  TENANT_BUNDLE_EXPORT_VERSION,
  validateTenantBundleImport,
  type TenantBundleExportDocument,
} from "./tenant-bundle-import-export.js";

const timestamp = "2026-01-01T00:00:00.000Z";

function createMinimalBundle(): TenantBundleExportDocument {
  return {
    version: TENANT_BUNDLE_EXPORT_VERSION,
    exportedAt: timestamp,
    sourceTenantId: "source_tenant",
    entityCategories: [
      {
        id: "cat_nav",
        tenantId: "source_tenant",
        name: "Operations",
        icon: "folder",
        order: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    entityDefinitions: [
      {
        id: "def_account",
        tenantId: "source_tenant",
        name: "account",
        label: "Accounts",
        navCategoryId: "cat_nav",
        fields: [{ name: "name", type: "string", required: true }],
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    entityUiOverrides: [],
    uiBuilderPresets: [],
    tenantDashboardLayout: null,
    roles: [],
    formulaDefinitions: [],
    hooks: [],
    metricDefinitions: [],
    entityQueryDefinitions: [],
    customViews: [],
  };
}

describe("validateTenantBundleImport", () => {
  it("accepts a minimal valid bundle", () => {
    const json = serializeTenantBundle(createMinimalBundle());
    const result = validateTenantBundleImport(json);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sourceTenantId).toBe("source_tenant");
    }
  });

  it("rejects unsupported bundle versions", () => {
    const json = JSON.stringify({
      ...createMinimalBundle(),
      version: 99,
    });

    const result = validateTenantBundleImport(json);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.path).toBe("$.version");
    }
  });

  it("rejects UI overrides for unknown entities", () => {
    const bundle = {
      ...createMinimalBundle(),
      entityUiOverrides: [
        {
          entityName: "missingEntity",
          views: [{ id: "default", label: "Default" }],
          updatedAt: timestamp,
        },
      ],
    };

    const result = validateTenantBundleImport(JSON.stringify(bundle));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toContain("missingEntity");
    }
  });

  it("rejects unknown navCategoryId references", () => {
    const bundle = {
      ...createMinimalBundle(),
      entityDefinitions: [
        {
          ...createMinimalBundle().entityDefinitions[0]!,
          navCategoryId: "cat_missing",
        },
      ],
    };

    const result = validateTenantBundleImport(JSON.stringify(bundle));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toContain("cat_missing");
    }
  });
});

describe("rewriteTenantBundleTenantId", () => {
  it("rewrites tenant-scoped records to the target tenant", () => {
    const rewritten = rewriteTenantBundleTenantId(
      createMinimalBundle(),
      "local_tenant",
    );

    expect(rewritten.entityCategories[0]?.tenantId).toBe("local_tenant");
    expect(rewritten.entityDefinitions[0]?.tenantId).toBe("local_tenant");
    expect(rewritten.sourceTenantId).toBe("source_tenant");
  });
});

describe("TENANT_BUNDLE_COLLECTION_IMPORT_ORDER", () => {
  it("matches the expected replace order", () => {
    assertTenantBundleCollectionImportOrder([
      ...TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
    ]);
  });
});
