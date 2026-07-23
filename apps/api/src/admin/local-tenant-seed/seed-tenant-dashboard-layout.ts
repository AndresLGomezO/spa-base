import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLocalTenantCatalogsDir } from "./load-tenant-config.js";

import {
  dashboardSectionsSchema,
  type PutTenantDashboardLayoutInput,
} from "@repo/entities";
import {
  createFirestoreAdminTenantDashboardLayoutRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import { z } from "zod";

const CATALOG_PATH = join(
  resolveLocalTenantCatalogsDir(),
  "tenant-dashboard-layout.json",
);

const tenantDashboardLayoutCatalogSchema = z
  .object({
    kind: z.literal("tenant-dashboard-layout-catalog"),
    version: z.literal(1),
    exportedAt: z.string().optional(),
    description: z.string().optional(),
    dashboardLayout: z.unknown(),
    dashboardSections: z.unknown(),
  })
  .strict();

export function parseLocalTenantDashboardLayoutCatalog(
  jsonText: string,
): PutTenantDashboardLayoutInput {
  const catalog = tenantDashboardLayoutCatalogSchema.parse(
    JSON.parse(jsonText),
  );

  return {
    dashboardLayout: uiLayoutDocumentSchema.parse(catalog.dashboardLayout),
    dashboardSections: dashboardSectionsSchema.parse(catalog.dashboardSections),
  };
}

export async function seedLocalTenantDashboardLayout(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<{ readonly seeded: boolean }> {
  const catalogJson = readFileSync(CATALOG_PATH, "utf8");
  const input = parseLocalTenantDashboardLayoutCatalog(catalogJson);
  const repository =
    createFirestoreAdminTenantDashboardLayoutRepository(firebaseAdminConfig);

  await repository.put(tenantId, input);
  console.log(
    `[seed]   tenant dashboard layout: ${input.dashboardSections.length} section(s)`,
  );

  return { seeded: true };
}
