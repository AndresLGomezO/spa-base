import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveTenantImportDir } from "../../scripts/resolve-tenant-import-dir.js";

export interface LocalTenantTestUserConfig {
  readonly email: string;
  readonly uid: string;
  readonly password: string;
  readonly displayName: string;
}

/** Copy an image file ref from a related record when the target field is empty. */
export interface RecordImageInheritanceRule {
  readonly entityName: string;
  readonly targetField: string;
  readonly relationField: string;
  readonly sourceEntity: string;
  readonly sourceField: string;
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
  /** Optional entity → image field map (e.g. `{ "actor": "logo" }`). */
  readonly recordImageFields: Readonly<Record<string, string>>;
  /** Optional rules to derive images from related records. */
  readonly recordImageInheritance: readonly RecordImageInheritanceRule[];
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
    recordImageFields: parseRecordImageFields(path, raw.recordImageFields),
    recordImageInheritance: parseRecordImageInheritance(
      path,
      raw.recordImageInheritance,
    ),
  };
}

function parseRecordImageFields(
  path: string,
  value: unknown,
): Readonly<Record<string, string>> {
  if (value === undefined) {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `Invalid tenant.json at ${path}: recordImageFields must be an object.`,
    );
  }
  const out: Record<string, string> = {};
  for (const [entityName, fieldName] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof fieldName !== "string" || fieldName.trim().length === 0) {
      throw new Error(
        `Invalid tenant.json at ${path}: recordImageFields.${entityName} must be a non-empty string.`,
      );
    }
    out[entityName] = fieldName.trim();
  }
  return out;
}

function parseRecordImageInheritance(
  path: string,
  value: unknown,
): readonly RecordImageInheritanceRule[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid tenant.json at ${path}: recordImageInheritance must be an array.`,
    );
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        `Invalid tenant.json at ${path}: recordImageInheritance[${index}] must be an object.`,
      );
    }
    const row = entry as Record<string, unknown>;
    const requireKey = (key: string): string => {
      const raw = row[key];
      if (typeof raw !== "string" || raw.trim().length === 0) {
        throw new Error(
          `Invalid tenant.json at ${path}: recordImageInheritance[${index}].${key} must be a non-empty string.`,
        );
      }
      return raw.trim();
    };
    return {
      entityName: requireKey("entityName"),
      targetField: requireKey("targetField"),
      relationField: requireKey("relationField"),
      sourceEntity: requireKey("sourceEntity"),
      sourceField: requireKey("sourceField"),
    };
  });
}

export function tryLoadLocalTenantConfig(
  startDir: string = process.cwd(),
): LocalTenantConfig | null {
  if (!localTenantImportPresent(startDir)) {
    return null;
  }
  return loadLocalTenantConfig(startDir);
}
