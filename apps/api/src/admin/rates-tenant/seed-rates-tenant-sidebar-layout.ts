import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  putTenantSidebarLayoutInputSchema,
  type PutTenantSidebarLayoutInput,
} from "@repo/entities";
import {
  createFirestoreAdminTenantSidebarLayoutRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { z } from "zod";

const CATALOG_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalogs",
  "rates-tenant-sidebar-layout.json",
);

const tenantSidebarLayoutCatalogSchema = z
  .object({
    kind: z.literal("tenant-sidebar-layout-catalog"),
    version: z.literal(1),
    exportedAt: z.string().optional(),
    description: z.string().optional(),
    sidebarLayout: z.unknown(),
    headerLayout: z.unknown(),
    footerLayout: z.unknown(),
    settings: z.unknown(),
  })
  .strict();

export function parseRatesTenantSidebarLayoutCatalog(
  jsonText: string,
): PutTenantSidebarLayoutInput {
  const catalog = tenantSidebarLayoutCatalogSchema.parse(JSON.parse(jsonText));

  return putTenantSidebarLayoutInputSchema.parse({
    sidebarLayout: catalog.sidebarLayout,
    headerLayout: catalog.headerLayout,
    footerLayout: catalog.footerLayout,
    settings: catalog.settings,
  });
}

export async function seedRatesTenantSidebarLayout(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<{ readonly seeded: boolean }> {
  const catalogJson = readFileSync(CATALOG_PATH, "utf8");
  const input = parseRatesTenantSidebarLayoutCatalog(catalogJson);
  const repository =
    createFirestoreAdminTenantSidebarLayoutRepository(firebaseAdminConfig);

  await repository.put(tenantId, input);
  console.log(
    `[seed]   tenant sidebar layout: hamburger=${input.settings.hamburgerBreakpoint}`,
  );

  return { seeded: true };
}
