import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveLocalTenantCatalogsDir } from "./load-tenant-config.js";

import {
  createFirestoreAdminTenantRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import type { TenantAppearance } from "@repo/shared-types";
import { importTenantTheme } from "@repo/theme/theme-import-export";

const CATALOG_PATH = join(
  resolveLocalTenantCatalogsDir(),
  "tenant-appearance.json",
);

function parseLocalTenantAppearanceCatalog(jsonText: string): TenantAppearance {
  return importTenantTheme(jsonText);
}

export async function seedLocalTenantAppearance(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<{ readonly seeded: boolean; readonly preset: string | undefined }> {
  const catalogJson = readFileSync(CATALOG_PATH, "utf8");
  const appearance = parseLocalTenantAppearanceCatalog(catalogJson);
  const repository = createFirestoreAdminTenantRepository(firebaseAdminConfig);
  const updated = await repository.update(tenantId, { appearance });

  if (!updated) {
    throw new Error(
      `Tenant "${tenantId}" was not found while seeding appearance.`,
    );
  }

  console.log(
    `[seed]   tenant appearance: preset ${appearance.preset ?? "default"}`,
  );

  return { seeded: true, preset: appearance.preset };
}
