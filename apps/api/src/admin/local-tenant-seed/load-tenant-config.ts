import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveTenantImportDir } from "../../scripts/resolve-tenant-import-dir.js";

export interface LocalTenantTestUserConfig {
  readonly email: string;
  readonly uid: string;
  readonly password: string;
  readonly displayName: string;
}

export interface LocalTenantConfig {
  readonly id: string;
  readonly name: string;
  readonly localImportOwnerEmail: string;
  readonly localImportTenantRole: string;
  readonly normalUserRole: string;
  readonly testUser: LocalTenantTestUserConfig;
  readonly gcpDemoOwnerUid: string;
  readonly gcpDemoUserRole: string;
  readonly indexProvisioningExcluded: boolean;
}

export function resolveLocalTenantCatalogsDir(
  startDir: string = process.cwd(),
): string {
  return join(resolveTenantImportDir(startDir), "catalogs");
}

function resolveLocalTenantConfigPath(
  startDir: string = process.cwd(),
): string {
  return join(resolveTenantImportDir(startDir), "tenant.json");
}

export function localTenantImportPresent(
  startDir: string = process.cwd(),
): boolean {
  return existsSync(resolveLocalTenantConfigPath(startDir));
}

export function loadLocalTenantConfig(
  startDir: string = process.cwd(),
): LocalTenantConfig {
  const path = resolveLocalTenantConfigPath(startDir);
  if (!existsSync(path)) {
    throw new Error(
      `Local tenant config not found at ${path}. Create .local/tenant-import/tenant.json to seed a local tenant.`,
    );
  }
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid tenant.json at ${path}: expected object.`);
  }
  const raw = parsed as Record<string, unknown>;
  const testUser = raw.testUser;
  if (!testUser || typeof testUser !== "object" || Array.isArray(testUser)) {
    throw new Error(`Invalid tenant.json at ${path}: missing testUser.`);
  }
  const tu = testUser as Record<string, unknown>;
  const requireString = (key: string, value: unknown): string => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Invalid tenant.json at ${path}: missing ${key}.`);
    }
    return value;
  };

  return {
    id: requireString("id", raw.id),
    name: requireString("name", raw.name),
    localImportOwnerEmail: requireString(
      "localImportOwnerEmail",
      raw.localImportOwnerEmail,
    ),
    localImportTenantRole: requireString(
      "localImportTenantRole",
      raw.localImportTenantRole,
    ),
    normalUserRole: requireString("normalUserRole", raw.normalUserRole),
    testUser: {
      email: requireString("testUser.email", tu.email),
      uid: requireString("testUser.uid", tu.uid),
      password: requireString("testUser.password", tu.password),
      displayName: requireString("testUser.displayName", tu.displayName),
    },
    gcpDemoOwnerUid: requireString("gcpDemoOwnerUid", raw.gcpDemoOwnerUid),
    gcpDemoUserRole: requireString("gcpDemoUserRole", raw.gcpDemoUserRole),
    indexProvisioningExcluded: raw.indexProvisioningExcluded === true,
  };
}

export function tryLoadLocalTenantConfig(
  startDir: string = process.cwd(),
): LocalTenantConfig | null {
  if (!localTenantImportPresent(startDir)) {
    return null;
  }
  return loadLocalTenantConfig(startDir);
}
