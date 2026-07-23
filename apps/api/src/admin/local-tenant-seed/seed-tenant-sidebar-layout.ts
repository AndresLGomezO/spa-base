import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLocalTenantCatalogsDir } from "./load-tenant-config.js";

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
  resolveLocalTenantCatalogsDir(),
  "tenant-sidebar-layout.json",
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

function parseLocalTenantSidebarLayoutCatalog(
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

export async function seedLocalTenantSidebarLayout(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<{ readonly seeded: boolean }> {
  const catalogJson = readFileSync(CATALOG_PATH, "utf8");
  const input = parseLocalTenantSidebarLayoutCatalog(catalogJson);
  const repository =
    createFirestoreAdminTenantSidebarLayoutRepository(firebaseAdminConfig);

  await repository.put(tenantId, input);
  console.log(
    `[seed]   tenant sidebar layout: hamburger=${input.settings.hamburgerBreakpoint}`,
  );

  return { seeded: true };
}
